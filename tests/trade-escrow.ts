import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import BN from "bn.js";
import {
  TOKEN_PROGRAM_ID,
  getAccount,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { assert } from "chai";

describe("trade-escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.TradeEscrow as Program;
  const PROGRAM_ID = new anchor.web3.PublicKey("EVn3aVUGYbx6yvHa5h4m5N3qfJkhKm1FnYeNsfbi34CZ");
  const buyer = provider.wallet as anchor.Wallet;
  const seller = anchor.web3.Keypair.generate();
  const usdcMint = new anchor.web3.PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

  let buyerTokenAccount: anchor.web3.PublicKey;
  let sellerTokenAccount: anchor.web3.PublicKey;
  const tradeId = anchor.web3.Keypair.generate().publicKey.toBuffer().subarray(0, 32);

  before(async function () {
    const transferTx = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.transfer({
        fromPubkey: provider.wallet.publicKey,
        toPubkey: seller.publicKey,
        lamports: 1_000_000_000,
      }),
    );
    await provider.sendAndConfirm(transferTx);

    const buyerTokenAccounts = await provider.connection.getParsedTokenAccountsByOwner(
      buyer.publicKey,
      { mint: usdcMint },
      "confirmed",
    );
    if (buyerTokenAccounts.value.length === 0) {
      this.skip();
      return;
    }
    buyerTokenAccount = buyerTokenAccounts.value[0].pubkey;

    const sellerAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      buyer.payer,
      usdcMint,
      seller.publicKey,
    );
    sellerTokenAccount = sellerAta.address;
  });

  it("creates a trade and locks funds", async () => {
    const amount = new BN(1_000_000);
    const deadline = new BN(Math.floor(Date.now() / 1000) + 3600);
    const trackingId = "TRACK123";
    const milestoneHash = Array.from(Buffer.alloc(32));

    const [tradePDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("trade"), buyer.publicKey.toBuffer(), Buffer.from(tradeId)],
      PROGRAM_ID,
    );
    const [vaultPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from(tradeId)],
      PROGRAM_ID,
    );
    const [vaultAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("authority")],
      PROGRAM_ID,
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
      PROGRAM_ID,
    );
    const proof = Buffer.alloc(64, 1);

    await program.methods
      .submitProof(Array.from(tradeId), proof)
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
      PROGRAM_ID,
    );
    const [vaultPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from(tradeId)],
      PROGRAM_ID,
    );
    const [authorityPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("authority")],
      PROGRAM_ID,
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
      PROGRAM_ID,
    );
    const [vaultPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from(tradeId)],
      PROGRAM_ID,
    );
    const [authorityPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("authority")],
      PROGRAM_ID,
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
    const invalidTradeId = anchor.web3.Keypair.generate().publicKey.toBuffer().subarray(0, 32);
    const amount = new BN(500_000);
    const pastDeadline = new BN(Math.floor(Date.now() / 1000) - 1);

    const [tradePDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("trade"), buyer.publicKey.toBuffer(), Buffer.from(invalidTradeId)],
      PROGRAM_ID,
    );
    const [vaultPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from(invalidTradeId)],
      PROGRAM_ID,
    );
    const [vaultAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("authority")],
      PROGRAM_ID,
    );

    try {
      await program.methods
        .createTrade(
          Array.from(invalidTradeId),
          amount,
          pastDeadline,
          Array.from(Buffer.alloc(32)),
          "TRACK-PAST",
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

  it("opens dispute after deadline passes", async () => {
    const shortTradeId = anchor.web3.Keypair.generate().publicKey.toBuffer().subarray(0, 32);
    const amount = new BN(200_000);
    const deadline = new BN(Math.floor(Date.now() / 1000) + 2);

    const [tradePDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("trade"), buyer.publicKey.toBuffer(), Buffer.from(shortTradeId)],
      PROGRAM_ID,
    );
    const [vaultPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from(shortTradeId)],
      PROGRAM_ID,
    );
    const [vaultAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("authority")],
      PROGRAM_ID,
    );

    await program.methods
      .createTrade(
        Array.from(shortTradeId),
        amount,
        deadline,
        Array.from(Buffer.alloc(32)),
        "TRACK-DISPUTE",
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

    await new Promise((resolve) => setTimeout(resolve, 3000));
    await program.methods
      .openDispute(Array.from(shortTradeId))
      .accounts({
        disputer: buyer.publicKey,
        tradeAccount: tradePDA,
      })
      .rpc();

    const trade = await program.account.tradeAccount.fetch(tradePDA);
    assert.deepEqual(trade.status, { disputed: {} });
  });
});
