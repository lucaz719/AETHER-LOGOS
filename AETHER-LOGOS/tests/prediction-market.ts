import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PredictionMarket } from "../target/types/prediction_market";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  createMint,
  createAccount,
  mintTo,
  getAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { assert } from "chai";

describe("prediction-market", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace
    .PredictionMarket as Program<PredictionMarket>;

  let usdcMint: PublicKey;
  let user1TokenAccount: PublicKey;
  let user2TokenAccount: PublicKey;

  const user2 = Keypair.generate();
  const shipmentTwin = Keypair.generate(); // mock compressed-NFT reference

  // Derive market PDA from shipment twin
  function getMarketPda(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("market"), shipmentTwin.publicKey.toBuffer()],
      program.programId
    );
  }

  before(async () => {
    // Airdrop SOL
    const airdrop1 = await provider.connection.requestAirdrop(
      provider.wallet.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdrop1);

    const airdrop2 = await provider.connection.requestAirdrop(
      user2.publicKey,
      5 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdrop2);

    // Create USDC mint
    usdcMint = await createMint(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      provider.wallet.publicKey,
      null,
      6
    );

    // Create token accounts
    user1TokenAccount = await createAccount(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      usdcMint,
      provider.wallet.publicKey
    );

    user2TokenAccount = await createAccount(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      usdcMint,
      user2.publicKey
    );

    // Mint 100 USDC to each user
    await mintTo(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      usdcMint,
      user1TokenAccount,
      provider.wallet.publicKey,
      100_000_000
    );

    await mintTo(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      usdcMint,
      user2TokenAccount,
      provider.wallet.publicKey,
      100_000_000
    );
  });

  it("creates a hedge market", async () => {
    const [marketPda] = getMarketPda();

    // Market vault PDA
    const [marketVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("market_vault"), marketPda.toBuffer()],
      program.programId
    );

    // Market authority PDA
    const [marketAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("market_authority"), marketPda.toBuffer()],
      program.programId
    );

    // Resolution time: 1 hour from now
    const resolutionTime = new anchor.BN(
      Math.floor(Date.now() / 1000) + 3600
    );

    await program.methods
      .createMarket("Will shipment arrive on-time?", resolutionTime, 200) // 2% fee
      .accounts({
        creator: provider.wallet.publicKey,
        shipmentTwin: shipmentTwin.publicKey,
        marketAccount: marketPda,
        marketVault: marketVault,
        marketAuthority: marketAuthority,
        usdcMint: usdcMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const market = await program.account.marketAccount.fetch(marketPda);
    assert.equal(market.question, "Will shipment arrive on-time?");
    assert.equal(market.protocolFeeBps, 200);
    assert.equal(market.totalYes.toNumber(), 0);
    assert.equal(market.totalNo.toNumber(), 0);
    assert.isNull(market.outcome);
    assert.deepEqual(market.status, { open: {} });

    console.log("✅ Hedge market created");
  });

  it("places a hedge on Yes side (user1)", async () => {
    const [marketPda] = getMarketPda();

    const [marketVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("market_vault"), marketPda.toBuffer()],
      program.programId
    );

    const [hedgePosition] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("position"),
        marketPda.toBuffer(),
        provider.wallet.publicKey.toBuffer(),
      ],
      program.programId
    );

    await program.methods
      .placeHedge({ yes: {} } as any, new anchor.BN(5_000_000)) // 5 USDC on Yes
      .accounts({
        user: provider.wallet.publicKey,
        marketAccount: marketPda,
        hedgePosition: hedgePosition,
        marketVault: marketVault,
        userTokenAccount: user1TokenAccount,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const market = await program.account.marketAccount.fetch(marketPda);
    assert.equal(market.totalYes.toNumber(), 5_000_000);
    assert.equal(market.totalNo.toNumber(), 0);

    const position = await program.account.hedgePosition.fetch(hedgePosition);
    assert.equal(position.amount.toNumber(), 5_000_000);
    assert.deepEqual(position.side, { yes: {} });
    assert.isFalse(position.claimed);

    console.log("✅ User1 placed 5 USDC hedge on Yes");
  });

  it("places a hedge on No side (user2)", async () => {
    const [marketPda] = getMarketPda();

    const [marketVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("market_vault"), marketPda.toBuffer()],
      program.programId
    );

    const [hedgePosition] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("position"),
        marketPda.toBuffer(),
        user2.publicKey.toBuffer(),
      ],
      program.programId
    );

    await program.methods
      .placeHedge({ no: {} } as any, new anchor.BN(3_000_000)) // 3 USDC on No
      .accounts({
        user: user2.publicKey,
        marketAccount: marketPda,
        hedgePosition: hedgePosition,
        marketVault: marketVault,
        userTokenAccount: user2TokenAccount,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([user2])
      .rpc();

    const market = await program.account.marketAccount.fetch(marketPda);
    assert.equal(market.totalYes.toNumber(), 5_000_000);
    assert.equal(market.totalNo.toNumber(), 3_000_000);

    console.log("✅ User2 placed 3 USDC hedge on No");
  });

  it("resolves market with Yes outcome", async () => {
    const [marketPda] = getMarketPda();

    await program.methods
      .resolveMarket(true) // Yes wins
      .accounts({
        creator: provider.wallet.publicKey,
        marketAccount: marketPda,
      })
      .rpc();

    const market = await program.account.marketAccount.fetch(marketPda);
    assert.deepEqual(market.status, { resolved: {} });
    assert.equal(market.outcome, true);

    console.log("✅ Market resolved: Yes wins");
  });

  it("claims winnings (user1 — winner)", async () => {
    const [marketPda] = getMarketPda();

    const [marketVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("market_vault"), marketPda.toBuffer()],
      program.programId
    );

    const [marketAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("market_authority"), marketPda.toBuffer()],
      program.programId
    );

    const [hedgePosition] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("position"),
        marketPda.toBuffer(),
        provider.wallet.publicKey.toBuffer(),
      ],
      program.programId
    );

    const balanceBefore = await getAccount(
      provider.connection,
      user1TokenAccount
    );

    await program.methods
      .claimWinnings()
      .accounts({
        user: provider.wallet.publicKey,
        marketAccount: marketPda,
        hedgePosition: hedgePosition,
        marketVault: marketVault,
        marketAuthority: marketAuthority,
        userTokenAccount: user1TokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const balanceAfter = await getAccount(
      provider.connection,
      user1TokenAccount
    );
    const payout = Number(balanceAfter.amount) - Number(balanceBefore.amount);

    // Pot = 8 USDC, fee = 2% = 0.16, net = 7.84 USDC
    // User1 has 5/5 of Yes side = 100% of net_pot = 7_840_000
    assert.equal(payout, 7_840_000);

    const position = await program.account.hedgePosition.fetch(hedgePosition);
    assert.isTrue(position.claimed);

    console.log(`✅ User1 claimed ${payout / 1_000_000} USDC winnings`);
  });

  it("rejects claim from losing side (user2)", async () => {
    const [marketPda] = getMarketPda();

    const [marketVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("market_vault"), marketPda.toBuffer()],
      program.programId
    );

    const [marketAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("market_authority"), marketPda.toBuffer()],
      program.programId
    );

    const [hedgePosition] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("position"),
        marketPda.toBuffer(),
        user2.publicKey.toBuffer(),
      ],
      program.programId
    );

    try {
      await program.methods
        .claimWinnings()
        .accounts({
          user: user2.publicKey,
          marketAccount: marketPda,
          hedgePosition: hedgePosition,
          marketVault: marketVault,
          marketAuthority: marketAuthority,
          userTokenAccount: user2TokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user2])
        .rpc();

      assert.fail("Should have thrown — user2 is on the losing side");
    } catch (err: any) {
      assert.include(err.toString(), "PositionNotWinning");
      console.log("✅ Correctly rejected claim from losing side");
    }
  });

  it("rejects double claim (user1)", async () => {
    const [marketPda] = getMarketPda();

    const [marketVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("market_vault"), marketPda.toBuffer()],
      program.programId
    );

    const [marketAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("market_authority"), marketPda.toBuffer()],
      program.programId
    );

    const [hedgePosition] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("position"),
        marketPda.toBuffer(),
        provider.wallet.publicKey.toBuffer(),
      ],
      program.programId
    );

    try {
      await program.methods
        .claimWinnings()
        .accounts({
          user: provider.wallet.publicKey,
          marketAccount: marketPda,
          hedgePosition: hedgePosition,
          marketVault: marketVault,
          marketAuthority: marketAuthority,
          userTokenAccount: user1TokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      assert.fail("Should have thrown — already claimed");
    } catch (err: any) {
      assert.include(err.toString(), "AlreadyClaimed");
      console.log("✅ Correctly rejected double claim");
    }
  });
});
