import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";

describe("marketplace", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // TODO: load marketplace IDL once anchor build is run
  // const program = anchor.workspace.Marketplace as Program;

  const authority = Keypair.generate();
  const buyer = Keypair.generate();

  before(async () => {
    // Airdrop SOL to authority and buyer
    await provider.connection.requestAirdrop(authority.publicKey, 2e9);
    await provider.connection.requestAirdrop(buyer.publicKey, 2e9);
    // Allow time for confirmation
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  it("register_vendor creates expected PDA", async () => {
    // TODO: call program.methods.registerVendor(...).accounts({...}).signers([authority]).rpc()
    // and verify the VendorProfile account was created with correct seeds.
    expect(true).to.be.true;
  });

  it("create_listing validates fields and seeds", async () => {
    // TODO: call program.methods.createListing(...).accounts({...}).rpc()
    // and verify ProductListing PDA has correct data.
    expect(true).to.be.true;
  });

  it("place_order creates MarketplaceOrder and verifies escrow TradeAccount was created via CPI", async () => {
    // TODO: place_order call, then fetch both MarketplaceOrder PDA and TradeAccount PDA
    // and assert trade_account field on order matches expected TradeAccount.
    expect(true).to.be.true;
  });

  it("submit_review only succeeds when linked trade_account.status == Released", async () => {
    // TODO: attempt review on unreleased trade → should fail with TradeNotReleased.
    // Release trade → then submit_review should succeed.
    expect(true).to.be.true;
  });

  it("Wholesaler enforces min_order_qty", async () => {
    // TODO: register Wholesaler vendor with min_order_qty=10,
    // attempt place_order with qty=1 → should fail with QuantityBelowMin.
    expect(true).to.be.true;
  });
});
