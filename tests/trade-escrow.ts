import * as anchor from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  getAccount,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { assert } from "chai";
import BN from "bn.js";
import tradeEscrowIdl from "../target/idl/trade_escrow.json" with { type: "json" };

describe("trade-escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const PROGRAM_ID = new anchor.web3.PublicKey(tradeEscrowIdl.address);
  const program = new anchor.Program(tradeEscrowIdl as any, provider);
  const buyer = provider.wallet as anchor.Wallet;
  const seller = anchor.web3.Keypair.generate();
  const usdcMint = new anchor.web3.PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

  let buyerTokenAccount: anchor.web3.PublicKey;
  let sellerTokenAccount: anchor.web3.PublicKey;
  const tradeId = anchor.web3.Keypair.generate().publicKey.toBuffer();
  const tradeIdBytes = Array.from(tradeId);

  const [tradePDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("trade"), buyer.publicKey.toBuffer(), tradeId],
    PROGRAM_ID,
  );
  const [vaultPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), tradeId],
    PROGRAM_ID,
  );
  const [authorityPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("authority")],
    PROGRAM_ID,
  );

  before(async function () {
    const transferTx = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.transfer({
        fromPubkey: buyer.publicKey,
        toPubkey: seller.publicKey,
        lamports: 100_000_000,
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

  it("1. buyer creates trade -> status AwaitingShipment", async () => {
    const amount = new BN(1_000_000);
    const milestoneHash = Array.from(Buffer.alloc(32, 1));

    await program.methods
      .createTrade(tradeIdBytes, amount, milestoneHash, false, null)
      .accounts({
        buyer: buyer.publicKey,
        seller: seller.publicKey,
        tradeAccount: tradePDA,
        escrowVault: vaultPDA,
        vaultAuthority: authorityPDA,
        buyerTokenAccount,
        usdcMint,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const trade = await program.account.tradeAccount.fetch(tradePDA);
    assert.isTrue(trade.status.awaitingShipment !== undefined);
  });

  it("2. seller submits tracking -> status InTransit", async () => {
    await program.methods
      .submitTracking(tradeIdBytes, "DHL1234567890", { dhl: {} })
      .accounts({
        seller: seller.publicKey,
        tradeAccount: tradePDA,
      })
      .signers([seller])
      .rpc();

    const trade = await program.account.tradeAccount.fetch(tradePDA);
    assert.isTrue(trade.status.inTransit !== undefined);
  });

  it("3. proof submitted -> status Verified", async () => {
    const proof = Buffer.alloc(64, 1);

    await program.methods
      .submitProof(tradeIdBytes, proof)
      .accounts({
        submitter: buyer.publicKey,
        tradeAccount: tradePDA,
      })
      .rpc();

    const trade = await program.account.tradeAccount.fetch(tradePDA);
    assert.isTrue(trade.status.verified !== undefined);
  });

  it("4. release funds -> status Released", async () => {
    const sellerBefore = await getAccount(provider.connection, sellerTokenAccount);

    await program.methods
      .releaseFunds(tradeIdBytes)
      .accounts({
        caller: buyer.publicKey,
        tradeAccount: tradePDA,
        escrowVault: vaultPDA,
        vaultAuthority: authorityPDA,
        sellerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const trade = await program.account.tradeAccount.fetch(tradePDA);
    assert.isTrue(trade.status.released !== undefined);

    const sellerAfter = await getAccount(provider.connection, sellerTokenAccount);
    assert.isAbove(Number(sellerAfter.amount), Number(sellerBefore.amount));
  });

  it("5. invalid amount -> InvalidAmount error", async () => {
    const newTradeId = anchor.web3.Keypair.generate().publicKey.toBuffer();
    const [newTradePDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("trade"), buyer.publicKey.toBuffer(), newTradeId],
      PROGRAM_ID,
    );
    const [newVaultPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), newTradeId],
      PROGRAM_ID,
    );

    try {
      await program.methods
        .createTrade(
          Array.from(newTradeId),
          new BN(0),
          Array.from(Buffer.alloc(32, 1)),
          false,
          null,
        )
        .accounts({
          buyer: buyer.publicKey,
          seller: seller.publicKey,
          tradeAccount: newTradePDA,
          escrowVault: newVaultPDA,
          vaultAuthority: authorityPDA,
          buyerTokenAccount,
          usdcMint,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      assert.fail("Should have thrown InvalidAmount");
    } catch (e: any) {
      assert.include(e.toString(), "InvalidAmount");
    }
  });
});
