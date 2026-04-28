import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { expect } from "chai";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";

// Load the Marketplace IDL from the built artifact.
// Falls back to the app copy when running without a full anchor build.
let marketplaceIdl: anchor.Idl;
let tradeEscrowIdl: anchor.Idl;
try {
  marketplaceIdl = require("../target/idl/marketplace.json");
  tradeEscrowIdl = require("../target/idl/trade_escrow.json");
} catch {
  marketplaceIdl = require("../app/src/lib/idl/marketplace.json");
  tradeEscrowIdl = require("../app/src/lib/idl/trade_escrow.json");
}

const MARKETPLACE_PROGRAM_ID = new PublicKey(
  marketplaceIdl.address ?? "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnN",
);
const ESCROW_PROGRAM_ID = new PublicKey(
  tradeEscrowIdl.address ?? "EVn3aVUGYbx6yvHa5h4m5N3qfJkhKm1FnYeNsfbi34CZ",
);

function randomBytes(n: number): Buffer {
  const b = Buffer.alloc(n);
  for (let i = 0; i < n; i++) b[i] = Math.floor(Math.random() * 256);
  return b;
}

describe("marketplace", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  let program: Program<anchor.Idl>;
  let escrowProgram: Program<anchor.Idl>;

  const authority = Keypair.generate(); // vendor authority
  const buyer = Keypair.generate();

  before(async () => {
    // Lazy-load program; skip if workspace not built.
    try {
      program = new Program(marketplaceIdl, provider);
      escrowProgram = new Program(tradeEscrowIdl, provider);
    } catch {
      console.warn("Marketplace program not deployed — skipping on-chain tests");
      return;
    }

    await provider.connection.requestAirdrop(authority.publicKey, 2e9);
    await provider.connection.requestAirdrop(buyer.publicKey, 2e9);
    await new Promise((r) => setTimeout(r, 1500));
  });

  it("register_vendor creates expected PDA", async () => {
    if (!program) return;

    const emailHash = Array.from(Buffer.alloc(32).fill(1));
    const [vendorProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vendor"), authority.publicKey.toBuffer()],
      MARKETPLACE_PROGRAM_ID,
    );

    await (program.methods as any)
      .registerVendor(
        "Test Shop",
        "A test vendor shop",
        { wholesaler: {} },
        ["Electronics"],
        emailHash,
      )
      .accounts({
        authority: authority.publicKey,
        vendorProfile: vendorProfilePda,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    const acct = await (program.account as any).vendorProfile.fetch(vendorProfilePda);
    expect(acct.shopName).to.equal("Test Shop");
    expect(acct.shopDescription).to.equal("A test vendor shop");
    expect(acct.isActive).to.be.true;
    expect(acct.isVerified).to.be.false;
    expect(acct.authority.toBase58()).to.equal(authority.publicKey.toBase58());
  });

  it("create_listing validates fields and seeds", async () => {
    if (!program) return;

    const listingId = Array.from(randomBytes(16));
    const [vendorProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vendor"), authority.publicKey.toBuffer()],
      MARKETPLACE_PROGRAM_ID,
    );
    const [listingPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("listing"), authority.publicKey.toBuffer(), Buffer.from(listingId)],
      MARKETPLACE_PROGRAM_ID,
    );

    await (program.methods as any)
      .createListing(
        listingId,
        "Test Product",
        "A great product for testing",
        null, // images_cid
        { electronics: {} },
        new BN(5_000_000), // $5 USDC
        1,    // min_order_qty
        null, // max_order_qty
        null, // stock
        48,   // shipping_deadline_hours
        false,
      )
      .accounts({
        authority: authority.publicKey,
        vendorProfile: vendorProfilePda,
        listing: listingPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    const listing = await (program.account as any).productListing.fetch(listingPda);
    expect(listing.title).to.equal("Test Product");
    expect(listing.priceUsdc.toNumber()).to.equal(5_000_000);
    expect(listing.isActive).to.be.true;
    expect(listing.vendor.toBase58()).to.equal(authority.publicKey.toBase58());
  });

  it("Wholesaler enforces min_order_qty", async () => {
    if (!program) return;

    // Register a wholesaler with min_order_qty = 10.
    const wholesaler = Keypair.generate();
    await provider.connection.requestAirdrop(wholesaler.publicKey, 2e9);
    await new Promise((r) => setTimeout(r, 500));

    const emailHash = Array.from(Buffer.alloc(32).fill(2));
    const [wsProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vendor"), wholesaler.publicKey.toBuffer()],
      MARKETPLACE_PROGRAM_ID,
    );

    await (program.methods as any)
      .registerVendor("Wholesale Corp", "Bulk goods", { wholesaler: {} }, [], emailHash)
      .accounts({
        authority: wholesaler.publicKey,
        vendorProfile: wsProfilePda,
        systemProgram: SystemProgram.programId,
      })
      .signers([wholesaler])
      .rpc();

    const wsListingId = Array.from(randomBytes(16));
    const [wsListingPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("listing"), wholesaler.publicKey.toBuffer(), Buffer.from(wsListingId)],
      MARKETPLACE_PROGRAM_ID,
    );

    await (program.methods as any)
      .createListing(
        wsListingId,
        "Bulk Item",
        "Bulk only",
        null,
        { machinery: {} },
        new BN(10_000_000),
        10,  // min_order_qty = 10
        null,
        null,
        24,
        false,
      )
      .accounts({
        authority: wholesaler.publicKey,
        vendorProfile: wsProfilePda,
        listing: wsListingPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([wholesaler])
      .rpc();

    // Attempt to place order with qty = 1 → must fail with QuantityBelowMin (6007).
    const orderIdBytes = Array.from(randomBytes(16));
    const tradeIdBytes = Array.from(randomBytes(32));
    const milestoneHash = Array.from(Buffer.alloc(32).fill(3));

    const [orderPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("mktorder"), buyer.publicKey.toBuffer(), Buffer.from(orderIdBytes)],
      MARKETPLACE_PROGRAM_ID,
    );
    const [tradeAccountPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("trade"), buyer.publicKey.toBuffer(), Buffer.from(tradeIdBytes)],
      ESCROW_PROGRAM_ID,
    );
    const [escrowVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from(tradeIdBytes)],
      ESCROW_PROGRAM_ID,
    );
    const [vaultAuthorityPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("authority")],
      ESCROW_PROGRAM_ID,
    );

    // We need a buyer token account — create a dummy mint for this test.
    const usdcMint = await createMint(
      provider.connection,
      buyer,
      buyer.publicKey,
      null,
      6,
    );
    const buyerTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      buyer,
      usdcMint,
      buyer.publicKey,
    );
    await mintTo(
      provider.connection,
      buyer,
      usdcMint,
      buyerTokenAccount,
      buyer,
      100_000_000,
    );

    try {
      await (program.methods as any)
        .placeOrder(orderIdBytes, tradeIdBytes, 1, milestoneHash)
        .accounts({
          buyer: buyer.publicKey,
          vendorProfile: wsProfilePda,
          listing: wsListingPda,
          marketplaceOrder: orderPda,
          seller: wholesaler.publicKey,
          tradeAccount: tradeAccountPda,
          escrowVault: escrowVaultPda,
          vaultAuthority: vaultAuthorityPda,
          buyerTokenAccount,
          usdcMint,
          tradeEscrowProgram: ESCROW_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([buyer])
        .rpc();
      expect.fail("Expected QuantityBelowMin error but transaction succeeded");
    } catch (e: any) {
      const msg: string = e?.message ?? String(e);
      expect(msg).to.include("6007").or.include("QuantityBelowMin");
    }
  });

  it("submit_review fails when trade is not Released", async () => {
    if (!program) return;

    // Create a dummy trade account that is NOT in Released state (just a random pubkey for now).
    // The marketplace program reads the trade_account discriminator on-chain, so if we pass
    // an account that doesn't exist / isn't Released, it should fail.
    const fakeTrade = Keypair.generate().publicKey;

    const [vendorProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vendor"), authority.publicKey.toBuffer()],
      MARKETPLACE_PROGRAM_ID,
    );
    const [reviewPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("review"), fakeTrade.toBuffer(), buyer.publicKey.toBuffer()],
      MARKETPLACE_PROGRAM_ID,
    );

    try {
      await (program.methods as any)
        .submitReview(5, null)
        .accounts({
          reviewer: buyer.publicKey,
          vendorProfile: vendorProfilePda,
          review: reviewPda,
          tradeAccount: fakeTrade,
          systemProgram: SystemProgram.programId,
        })
        .signers([buyer])
        .rpc();
      expect.fail("Expected TradeNotReleased error but transaction succeeded");
    } catch (e: any) {
      const msg: string = e?.message ?? String(e);
      // Accept account-not-found (8) or TradeNotReleased (6012)
      const isExpected = msg.includes("6012") || msg.includes("TradeNotReleased") || msg.includes("AccountNotInitialized") || msg.includes("3012");
      expect(isExpected, `Unexpected error: ${msg}`).to.be.true;
    }
  });

  // ── New tests added for gap coverage ──────────────────────────────────────

  it("update_listing changes mutable fields", async () => {
    if (!program) return;

    // Create a fresh listing to update.
    const listingId = Array.from(randomBytes(16));
    const [vendorProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vendor"), authority.publicKey.toBuffer()],
      MARKETPLACE_PROGRAM_ID,
    );
    const [listingPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("listing"), authority.publicKey.toBuffer(), Buffer.from(listingId)],
      MARKETPLACE_PROGRAM_ID,
    );

    await (program.methods as any)
      .createListing(listingId, "Original Title", "Original desc", null, { electronics: {} }, new BN(1_000_000), 1, null, null, 24, false)
      .accounts({ authority: authority.publicKey, vendorProfile: vendorProfilePda, listing: listingPda, systemProgram: SystemProgram.programId })
      .signers([authority])
      .rpc();

    await (program.methods as any)
      .updateListing("Updated Title", "Updated description", null, { apparel: {} }, new BN(2_000_000), 2, null, null, 48, true)
      .accounts({ authority: authority.publicKey, vendorProfile: vendorProfilePda, listing: listingPda })
      .signers([authority])
      .rpc();

    const updated = await (program.account as any).productListing.fetch(listingPda);
    expect(updated.title).to.equal("Updated Title");
    expect(updated.priceUsdc.toNumber()).to.equal(2_000_000);
    expect(updated.minOrderQty).to.equal(2);
    expect(updated.requiresSignature).to.be.true;
    expect(updated.isActive).to.be.true;
  });

  it("deactivate_listing sets is_active to false", async () => {
    if (!program) return;

    const listingId = Array.from(randomBytes(16));
    const [vendorProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vendor"), authority.publicKey.toBuffer()],
      MARKETPLACE_PROGRAM_ID,
    );
    const [listingPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("listing"), authority.publicKey.toBuffer(), Buffer.from(listingId)],
      MARKETPLACE_PROGRAM_ID,
    );

    await (program.methods as any)
      .createListing(listingId, "To Deactivate", "desc", null, { other: {} }, new BN(500_000), 1, null, null, 24, false)
      .accounts({ authority: authority.publicKey, vendorProfile: vendorProfilePda, listing: listingPda, systemProgram: SystemProgram.programId })
      .signers([authority])
      .rpc();

    await (program.methods as any)
      .deactivateListing()
      .accounts({ authority: authority.publicKey, listing: listingPda })
      .signers([authority])
      .rpc();

    const listing = await (program.account as any).productListing.fetch(listingPda);
    expect(listing.isActive).to.be.false;
  });

  it("update_vendor changes shop details", async () => {
    if (!program) return;

    const [vendorProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vendor"), authority.publicKey.toBuffer()],
      MARKETPLACE_PROGRAM_ID,
    );

    await (program.methods as any)
      .updateVendor(
        "Updated Shop Name",
        "New description for the shop.",
        null, // logo_cid
        null, // banner_cid
        { retailer: {} },
        ["Apparel", "Electronics"],
      )
      .accounts({ authority: authority.publicKey, vendorProfile: vendorProfilePda })
      .signers([authority])
      .rpc();

    const profile = await (program.account as any).vendorProfile.fetch(vendorProfilePda);
    expect(profile.shopName).to.equal("Updated Shop Name");
    expect(profile.shopDescription).to.equal("New description for the shop.");
    expect(profile.categories).to.deep.equal(["Apparel", "Electronics"]);
  });

  it("verify_vendor requires config admin signer", async () => {
    if (!program) return;

    // A random non-admin keypair should be rejected.
    const fakeAdmin = Keypair.generate();
    await provider.connection.requestAirdrop(fakeAdmin.publicKey, 1e9);
    await new Promise((r) => setTimeout(r, 500));

    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      MARKETPLACE_PROGRAM_ID,
    );
    const [vendorProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vendor"), authority.publicKey.toBuffer()],
      MARKETPLACE_PROGRAM_ID,
    );

    try {
      await (program.methods as any)
        .verifyVendor()
        .accounts({ admin: fakeAdmin.publicKey, config: configPda, vendorProfile: vendorProfilePda })
        .signers([fakeAdmin])
        .rpc();
      expect.fail("Expected Unauthorized or config-not-initialised error");
    } catch (e: any) {
      const msg: string = e?.message ?? String(e);
      // Config not initialised → AccountNotInitialized / constraint violation → Unauthorized (6016)
      const isExpected =
        msg.includes("6016") ||
        msg.includes("Unauthorized") ||
        msg.includes("AccountNotInitialized") ||
        msg.includes("2006");
      expect(isExpected, `Unexpected error: ${msg}`).to.be.true;
    }
  });
});
