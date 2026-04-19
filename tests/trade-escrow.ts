import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
  getAccount,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { assert } from "chai";

describe("trade-escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.TradeEscrow as Program;
  const buyer = provider.wallet as anchor.Wallet;
  const seller = anchor.web3.Keypair.generate();
  const tradeId = anchor.web3.Keypair.generate().publicKey.toBuffer().subarray(0, 16);
  const usdcMint = new anchor.web3.PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

  let buyerTokenAccount: anchor.web3.PublicKey;
  let sellerTokenAccount: anchor.web3.PublicKey;

  before(async () => {
    const sig = await provider.connection.requestAirdrop(seller.publicKey, 2e9);
    await provider.connection.confirmTransaction(sig, "confirmed");

    buyerTokenAccount = getAssociatedTokenAddressSync(usdcMint, buyer.publicKey);
    sellerTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      buyer.payer,
      usdcMint,
      seller.publicKey,
    );
  });

  it("creates a trade and locks funds", async () => {
    const amount = new anchor.BN(100_000_000);
    const deadline = new anchor.BN(Math.floor(Date.now() / 1000) + 3600);
    const trackingId = "TRACK123";
    const milestoneHash = Array.from(Buffer.alloc(32));

    const [tradePDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("trade"), buyer.publicKey.toBuffer(), Buffer.from(tradeId)],
      program.programId,
    );
    const [vaultPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from(tradeId)],
      program.programId,
    );
    const [vaultAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("authority")],
      program.programId,
    );

    await program.methods
      .createTrade(Array.from(tradeId), amount, deadline, milestoneHash, trackingId, { dhl: {} })
      .accounts({
        buyer: buyer.publicKey,
        seller: seller.publicKey,
        tradeAccount: tradePDA,
        escrowVault: vaultPDA,
        vaultAuthority,
        buyerTokenAccount,
        usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const vault = await getAccount(provider.connection, vaultPDA);
    assert.equal(vault.amount.toString(), amount.toString());
  });

  it("submits proof and verifies trade", async () => {
    const [tradePDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("trade"), buyer.publicKey.toBuffer(), Buffer.from(tradeId)],
      program.programId,
    );
    const proof = Buffer.alloc(64, 1);

    await program.methods
      .submitProof(Array.from(tradeId), Array.from(proof))
      .accounts({
        submitter: buyer.publicKey,
        tradeAccount: tradePDA,
      })
      .rpc();

    const trade = await program.account.tradeAccount.fetch(tradePDA);
    assert.isTrue(trade.milestoneVerified);
    assert.deepEqual(trade.status, { verified: {} });
  });

  it("releases funds to seller", async () => {
    const [tradePDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("trade"), buyer.publicKey.toBuffer(), Buffer.from(tradeId)],
      program.programId,
    );
    const [vaultPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from(tradeId)],
      program.programId,
    );
    const [authorityPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("authority")],
      program.programId,
    );
    const sellerBefore = await getAccount(provider.connection, sellerTokenAccount);

    await program.methods
      .releaseFunds(Array.from(tradeId))
      .accounts({
        caller: buyer.publicKey,
        tradeAccount: tradePDA,
        escrowVault: vaultPDA,
        sellerTokenAccount,
        vaultAuthority: authorityPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const sellerAfter = await getAccount(provider.connection, sellerTokenAccount);
    assert.isAbove(Number(sellerAfter.amount), Number(sellerBefore.amount));
    const trade = await program.account.tradeAccount.fetch(tradePDA);
    assert.deepEqual(trade.status, { released: {} });
  });

  it("fails to release funds twice", async () => {
    const [tradePDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("trade"), buyer.publicKey.toBuffer(), Buffer.from(tradeId)],
      program.programId,
    );
    const [vaultPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from(tradeId)],
      program.programId,
    );
    const [authorityPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("authority")],
      program.programId,
    );

    try {
      await program.methods
        .releaseFunds(Array.from(tradeId))
        .accounts({
          caller: buyer.publicKey,
          tradeAccount: tradePDA,
          escrowVault: vaultPDA,
          sellerTokenAccount,
          vaultAuthority: authorityPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      assert.fail("Should have thrown");
    } catch (e) {
      assert.include(String(e), "InvalidState");
    }
  });

  it("rejects creating a trade with past deadline", async () => {
    const disputeTradeId = anchor.web3.Keypair.generate().publicKey.toBuffer().subarray(0, 16);
    const amount = new anchor.BN(50_000_000);
    const deadline = new anchor.BN(Math.floor(Date.now() / 1000) - 1);

    const [tradePDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("trade"), buyer.publicKey.toBuffer(), Buffer.from(disputeTradeId)],
      program.programId,
    );
    const [vaultPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from(disputeTradeId)],
      program.programId,
    );
    const [vaultAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("authority")],
      program.programId,
    );

    try {
      await program.methods
        .createTrade(
          Array.from(disputeTradeId),
          amount,
          deadline,
          Array.from(Buffer.alloc(32)),
          "TRACK456",
          { dhl: {} },
        )
        .accounts({
          buyer: buyer.publicKey,
          seller: seller.publicKey,
          tradeAccount: tradePDA,
          escrowVault: vaultPDA,
          vaultAuthority,
          buyerTokenAccount,
          usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      assert.fail("Should have thrown DeadlineInPast");
    } catch (e) {
      assert.include(String(e), "DeadlineInPast");
    }
  });
});
