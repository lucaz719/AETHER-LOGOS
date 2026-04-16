import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert } from "chai";

// Note: Types will be generated after `anchor build`
// import { TradeEscrow } from "../target/types/trade_escrow";

describe("trade-escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // const program = anchor.workspace.TradeEscrow as Program<TradeEscrow>;

  it("creates a trade escrow", async () => {
    // TODO: Initialize USDC mint, create token accounts
    // const tradeId = new Uint8Array(16);
    // crypto.getRandomValues(tradeId);
    //
    // const [tradePda] = anchor.web3.PublicKey.findProgramAddressSync(
    //   [Buffer.from("trade"), provider.wallet.publicKey.toBuffer(), Buffer.from(tradeId)],
    //   program.programId
    // );
    //
    // await program.methods
    //   .createTrade(
    //     Array.from(tradeId),
    //     new anchor.BN(1_000_000), // 1 USDC
    //     Array.from(new Uint8Array(32)), // milestone hash
    //     "DHL1234567890",
    //     { dhl: {} }
    //   )
    //   .accounts({...})
    //   .rpc();
    //
    // const trade = await program.account.tradeAccount.fetch(tradePda);
    // assert.equal(trade.status, { locked: {} });
    console.log("Test scaffold ready - implement after anchor build");
  });

  it("submits a proof and verifies milestone", async () => {
    // TODO: Submit mock proof, verify status changes to Verified
    console.log("Test scaffold ready - implement after anchor build");
  });

  it("releases funds after verification", async () => {
    // TODO: Release funds after successful proof, verify USDC transfer
    console.log("Test scaffold ready - implement after anchor build");
  });

  it("opens a dispute", async () => {
    // TODO: Open dispute, verify status changes to Disputed
    console.log("Test scaffold ready - implement after anchor build");
  });

  it("admin resolves a dispute", async () => {
    // TODO: Admin resolves dispute, verify funds go to winner
    console.log("Test scaffold ready - implement after anchor build");
  });
});
