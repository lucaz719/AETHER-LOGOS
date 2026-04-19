import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TradeEscrow } from "../target/types/trade_escrow";
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

describe("trade-escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.TradeEscrow as Program<TradeEscrow>;

  // Shared state across tests
  let usdcMint: PublicKey;
  let buyerTokenAccount: PublicKey;
  let sellerTokenAccount: PublicKey;

  const seller = Keypair.generate();
  const tradeId = new Uint8Array(16);
  // Fill tradeId with a deterministic value for reproducibility
  for (let i = 0; i < 16; i++) tradeId[i] = i + 1;

  const amountUsdc = new anchor.BN(1_000_000); // 1 USDC
  const milestoneHash = new Uint8Array(32); // zeroed hash for test

  before(async () => {
    // Airdrop SOL to the provider wallet (buyer) and seller
    const buyerAirdrop = await provider.connection.requestAirdrop(
      provider.wallet.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(buyerAirdrop);

    const sellerAirdrop = await provider.connection.requestAirdrop(
      seller.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sellerAirdrop);

    // Create a fake USDC mint (6 decimals)
    usdcMint = await createMint(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      provider.wallet.publicKey, // mint authority
      null,
      6
    );

    // Create buyer and seller token accounts
    buyerTokenAccount = await createAccount(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      usdcMint,
      provider.wallet.publicKey
    );

    sellerTokenAccount = await createAccount(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      usdcMint,
      seller.publicKey
    );

    // Mint 100 USDC to buyer
    await mintTo(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      usdcMint,
      buyerTokenAccount,
      provider.wallet.publicKey,
      100_000_000 // 100 USDC
    );
  });

  // Derive PDAs used across tests
  function getTradePda(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("trade"),
        provider.wallet.publicKey.toBuffer(),
        Buffer.from(tradeId),
      ],
      program.programId
    );
  }

  function getVaultPda(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from(tradeId)],
      program.programId
    );
  }

  function getVaultAuthorityPda(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("authority")],
      program.programId
    );
  }

  it("creates a trade escrow", async () => {
    const [tradePda] = getTradePda();
    const [vaultPda] = getVaultPda();
    const [vaultAuthority] = getVaultAuthorityPda();

    await program.methods
      .createTrade(
        Array.from(tradeId) as any,
        amountUsdc,
        Array.from(milestoneHash) as any,
        "DHL1234567890",
        { dhl: {} } as any
      )
      .accounts({
        buyer: provider.wallet.publicKey,
        seller: seller.publicKey,
        tradeAccount: tradePda,
        escrowVault: vaultPda,
        vaultAuthority: vaultAuthority,
        buyerTokenAccount: buyerTokenAccount,
        usdcMint: usdcMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    // Verify on-chain state
    const trade = await program.account.tradeAccount.fetch(tradePda);
    assert.deepEqual(trade.tradeId, Array.from(tradeId));
    assert.equal(trade.buyer.toBase58(), provider.wallet.publicKey.toBase58());
    assert.equal(trade.seller.toBase58(), seller.publicKey.toBase58());
    assert.equal(trade.amountUsdc.toNumber(), 1_000_000);
    assert.equal(trade.trackingId, "DHL1234567890");
    assert.isFalse(trade.milestoneVerified);
    assert.deepEqual(trade.status, { locked: {} });

    // Verify vault received USDC
    const vault = await getAccount(provider.connection, vaultPda);
    assert.equal(Number(vault.amount), 1_000_000);

    console.log("✅ Trade escrow created and USDC deposited");
  });

  it("submits a proof and verifies milestone", async () => {
    const [tradePda] = getTradePda();

    // Submit a mock proof (non-empty bytes)
    const mockProof = Buffer.from("mock-zktls-proof-data");

    await program.methods
      .submitProof(Array.from(tradeId) as any, mockProof as any)
      .accounts({
        submitter: provider.wallet.publicKey,
        tradeAccount: tradePda,
      })
      .rpc();

    const trade = await program.account.tradeAccount.fetch(tradePda);
    assert.isTrue(trade.milestoneVerified);
    assert.deepEqual(trade.status, { verified: {} });

    console.log("✅ zkTLS proof submitted, milestone verified");
  });

  it("releases funds after verification", async () => {
    const [tradePda] = getTradePda();
    const [vaultPda] = getVaultPda();
    const [vaultAuthority] = getVaultAuthorityPda();

    const sellerBefore = await getAccount(
      provider.connection,
      sellerTokenAccount
    );

    await program.methods
      .releaseFunds(Array.from(tradeId) as any)
      .accounts({
        caller: provider.wallet.publicKey,
        tradeAccount: tradePda,
        escrowVault: vaultPda,
        vaultAuthority: vaultAuthority,
        sellerTokenAccount: sellerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const trade = await program.account.tradeAccount.fetch(tradePda);
    assert.deepEqual(trade.status, { released: {} });

    // Verify seller received USDC
    const sellerAfter = await getAccount(
      provider.connection,
      sellerTokenAccount
    );
    assert.equal(
      Number(sellerAfter.amount) - Number(sellerBefore.amount),
      1_000_000
    );

    console.log("✅ Funds released to seller");
  });

  // --- Dispute flow uses a separate trade ---

  const tradeId2 = new Uint8Array(16);
  for (let i = 0; i < 16; i++) tradeId2[i] = i + 100;

  function getTradePda2(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("trade"),
        provider.wallet.publicKey.toBuffer(),
        Buffer.from(tradeId2),
      ],
      program.programId
    );
  }

  function getVaultPda2(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from(tradeId2)],
      program.programId
    );
  }

  it("opens a dispute", async () => {
    const [tradePda2] = getTradePda2();
    const [vaultPda2] = getVaultPda2();
    const [vaultAuthority] = getVaultAuthorityPda();

    // First create a second trade for the dispute test
    await program.methods
      .createTrade(
        Array.from(tradeId2) as any,
        new anchor.BN(500_000), // 0.5 USDC
        Array.from(milestoneHash) as any,
        "FEDEX9876543",
        { fedEx: {} } as any
      )
      .accounts({
        buyer: provider.wallet.publicKey,
        seller: seller.publicKey,
        tradeAccount: tradePda2,
        escrowVault: vaultPda2,
        vaultAuthority: vaultAuthority,
        buyerTokenAccount: buyerTokenAccount,
        usdcMint: usdcMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    // Buyer opens dispute
    await program.methods
      .openDispute(Array.from(tradeId2) as any)
      .accounts({
        disputer: provider.wallet.publicKey,
        tradeAccount: tradePda2,
      })
      .rpc();

    const trade = await program.account.tradeAccount.fetch(tradePda2);
    assert.deepEqual(trade.status, { disputed: {} });

    console.log("✅ Dispute opened on trade #2");
  });

  it("admin resolves a dispute", async () => {
    const [tradePda2] = getTradePda2();
    const [vaultPda2] = getVaultPda2();
    const [vaultAuthority] = getVaultAuthorityPda();

    // Admin (buyer) resolves in favour of seller
    await program.methods
      .adminResolve(Array.from(tradeId2) as any, seller.publicKey)
      .accounts({
        admin: provider.wallet.publicKey,
        tradeAccount: tradePda2,
        escrowVault: vaultPda2,
        vaultAuthority: vaultAuthority,
        winnerTokenAccount: sellerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const trade = await program.account.tradeAccount.fetch(tradePda2);
    assert.deepEqual(trade.status, { released: {} });

    console.log("✅ Dispute resolved, funds sent to seller");
  });
});
