/**
 * scripts/init_marketplace.ts
 *
 * One-time deployment script: initialises the MarketplaceConfig PDA on-chain.
 * Must be run once by the programme authority (admin wallet) after first deploy.
 *
 * Usage (localnet):
 *   ANCHOR_PROVIDER_URL=http://localhost:8899 \
 *   ANCHOR_WALLET=~/.config/solana/id.json \
 *   npx ts-node scripts/init_marketplace.ts
 *
 * Usage (devnet):
 *   ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
 *   ANCHOR_WALLET=~/.config/solana/id.json \
 *   npx ts-node scripts/init_marketplace.ts
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";

// Fallback to IDL copy in app when target/ is not built.
let marketplaceIdl: anchor.Idl;
try {
  marketplaceIdl = require("../target/idl/marketplace.json");
} catch {
  marketplaceIdl = require("../app/src/lib/idl/marketplace.json");
}

const MARKETPLACE_PROGRAM_ID = new PublicKey(
  (marketplaceIdl as any).address ??
    "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnN",
);

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = new anchor.Program(marketplaceIdl, provider);
  const admin = provider.wallet.publicKey;

  const [configPda, configBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    MARKETPLACE_PROGRAM_ID,
  );

  // Check if already initialised.
  const existing = await provider.connection.getAccountInfo(configPda);
  if (existing) {
    console.log("✅  MarketplaceConfig already initialised at", configPda.toBase58());
    return;
  }

  console.log("🚀  Initialising MarketplaceConfig...");
  console.log("    Admin:      ", admin.toBase58());
  console.log("    Config PDA: ", configPda.toBase58(), " (bump:", configBump, ")");
  console.log("    Cluster:    ", provider.connection.rpcEndpoint);

  const tx = await (program.methods as any)
    .initConfig()
    .accounts({
      admin,
      config: configPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("✅  MarketplaceConfig initialised — tx:", tx);
}

main().catch((err) => {
  console.error("❌  init_marketplace failed:", err);
  process.exit(1);
});
