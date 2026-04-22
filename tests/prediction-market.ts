import * as anchor from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { assert } from "chai";
import BN from "bn.js";
import predictionMarketIdl from "../target/idl/prediction_market.json" with { type: "json" };

describe("prediction-market", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const PROGRAM_ID = new anchor.web3.PublicKey("DgYUcbjMg8Mm4T8PTiiboca7AN9y9urLmYXfhYnSJuZb");
  const marketIdl = {
    ...predictionMarketIdl,
    address: PROGRAM_ID.toBase58(),
  };
  const program = new anchor.Program(marketIdl as any, provider);
  const creator = provider.wallet as anchor.Wallet;
  const noUser = anchor.web3.Keypair.generate();
  const shipmentTwin = anchor.web3.Keypair.generate().publicKey;

  let usdcMint: anchor.web3.PublicKey;
  let creatorTokenAccount: anchor.web3.PublicKey;
  let noUserTokenAccount: anchor.web3.PublicKey;

  const [marketPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("market"), shipmentTwin.toBuffer()],
    program.programId,
  );
  const [marketVaultPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("market_vault"), marketPDA.toBuffer()],
    program.programId,
  );
  const [marketAuthorityPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("market_authority"), marketPDA.toBuffer()],
    program.programId,
  );
  const [yesPositionPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("position"), marketPDA.toBuffer(), creator.publicKey.toBuffer()],
    program.programId,
  );
  const [noPositionPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("position"), marketPDA.toBuffer(), noUser.publicKey.toBuffer()],
    program.programId,
  );

  before(async () => {
    const fundNoUserTx = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.transfer({
        fromPubkey: creator.publicKey,
        toPubkey: noUser.publicKey,
        lamports: 100_000_000,
      }),
    );
    await provider.sendAndConfirm(fundNoUserTx);

    usdcMint = await createMint(provider.connection, creator.payer, creator.publicKey, null, 6);

    const creatorAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      creator.payer,
      usdcMint,
      creator.publicKey,
    );
    creatorTokenAccount = creatorAta.address;

    const noUserAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      creator.payer,
      usdcMint,
      noUser.publicKey,
    );
    noUserTokenAccount = noUserAta.address;

    await mintTo(provider.connection, creator.payer, usdcMint, creatorTokenAccount, creator.publicKey, 2_000_000);
    await mintTo(provider.connection, creator.payer, usdcMint, noUserTokenAccount, creator.publicKey, 2_000_000);
  });

  it("1. createMarket -> status Open", async () => {
    const resolutionTime = Math.floor(Date.now() / 1000) + 2;

    await program.methods
      .createMarket("Will shipment arrive safely?", new BN(resolutionTime), 200)
      .accounts({
        creator: creator.publicKey,
        shipmentTwin,
        marketAccount: marketPDA,
        marketVault: marketVaultPDA,
        marketAuthority: marketAuthorityPDA,
        usdcMint,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const market = await program.account.marketAccount.fetch(marketPDA);
    assert.isTrue(market.status.open !== undefined);
  });

  it("2. placeHedge yes", async () => {
    await program.methods
      .placeHedge({ yes: {} }, new BN(1_000_000))
      .accounts({
        user: creator.publicKey,
        marketAccount: marketPDA,
        hedgePosition: yesPositionPDA,
        marketVault: marketVaultPDA,
        userTokenAccount: creatorTokenAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const market = await program.account.marketAccount.fetch(marketPDA);
    assert.equal(Number(market.totalYes), 1_000_000);
  });

  it("3. placeHedge no", async () => {
    await program.methods
      .placeHedge({ no: {} }, new BN(1_000_000))
      .accounts({
        user: noUser.publicKey,
        marketAccount: marketPDA,
        hedgePosition: noPositionPDA,
        marketVault: marketVaultPDA,
        userTokenAccount: noUserTokenAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([noUser])
      .rpc();

    const market = await program.account.marketAccount.fetch(marketPDA);
    assert.equal(Number(market.totalNo), 1_000_000);
  });

  it("4. resolveMarket (yes wins)", async () => {
    await new Promise((resolve) => setTimeout(resolve, 2500));

    await program.methods
      .resolveMarket(true)
      .accounts({
        creator: creator.publicKey,
        marketAccount: marketPDA,
      })
      .rpc();

    const market = await program.account.marketAccount.fetch(marketPDA);
    assert.isTrue(market.status.resolved !== undefined);
    assert.equal(market.outcome, true);
  });

  it("5. claimWinnings yes side receives tokens", async () => {
    const before = await getAccount(provider.connection, creatorTokenAccount);

    await program.methods
      .claimWinnings()
      .accounts({
        user: creator.publicKey,
        marketAccount: marketPDA,
        hedgePosition: yesPositionPDA,
        marketVault: marketVaultPDA,
        marketAuthority: marketAuthorityPDA,
        userTokenAccount: creatorTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const after = await getAccount(provider.connection, creatorTokenAccount);
    assert.isAbove(Number(after.amount), Number(before.amount));
  });

  it("6. claimWinnings no side fails", async () => {
    try {
      await program.methods
        .claimWinnings()
        .accounts({
          user: noUser.publicKey,
          marketAccount: marketPDA,
          hedgePosition: noPositionPDA,
          marketVault: marketVaultPDA,
          marketAuthority: marketAuthorityPDA,
          userTokenAccount: noUserTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([noUser])
        .rpc();
      assert.fail("Should have thrown PositionNotWinning");
    } catch (e: any) {
      assert.include(e.toString(), "PositionNotWinning");
    }
  });

  it("7. double claim fails", async () => {
    try {
      await program.methods
        .claimWinnings()
        .accounts({
          user: creator.publicKey,
          marketAccount: marketPDA,
          hedgePosition: yesPositionPDA,
          marketVault: marketVaultPDA,
          marketAuthority: marketAuthorityPDA,
          userTokenAccount: creatorTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      assert.fail("Should have thrown AlreadyClaimed");
    } catch (e: any) {
      assert.include(e.toString(), "AlreadyClaimed");
    }
  });
});
