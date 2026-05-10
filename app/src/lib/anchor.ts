import { AnchorProvider, Idl, Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import tradeEscrowIdl from "./idl/trade_escrow.json";
import predictionMarketIdl from "./idl/prediction_market.json";
import marketplaceIdl from "./idl/marketplace.json";

const DEFAULT_ESCROW_PROGRAM_ID = "7CN3FCG4rsVpuHPaMXtzsqb9GY7MmpNr4EYizFGKM7Gc";
const DEFAULT_MARKET_PROGRAM_ID = "Aopbcs5WyUGqhezfAofgaFEETbFi3eeh97gqahG3darr";

export const ESCROW_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_TRADE_ESCROW_PROGRAM_ID ?? 
  process.env.NEXT_PUBLIC_ESCROW_PROGRAM_ID ?? 
  (tradeEscrowIdl as any).metadata?.address ??
  (tradeEscrowIdl as any).address ??
  DEFAULT_ESCROW_PROGRAM_ID
);
export const MARKET_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PREDICTION_MARKET_PROGRAM_ID ??
  process.env.NEXT_PUBLIC_MARKET_PROGRAM_ID ?? 
  (predictionMarketIdl as any).metadata?.address ??
  (predictionMarketIdl as any).address ??
  DEFAULT_MARKET_PROGRAM_ID
);
export const MARKETPLACE_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_MARKETPLACE_PROGRAM_ID ??
  (marketplaceIdl as any).metadata?.address ??
  (marketplaceIdl as any).address ??
  DEFAULT_ESCROW_PROGRAM_ID // fallback
);

// HACKATHON MOCK - Platform fee recipient wallet
// The on-chain ReleaseFunds instruction doesn't validate this account's owner (bug),
// so we hardcode a devnet wallet here for the demo. Replace with treasury PDA before mainnet.
export const PLATFORM_TREASURY_PUBKEY = new PublicKey(
  process.env.NEXT_PUBLIC_PLATFORM_TREASURY ?? "11111111111111111111111111111111"
);

export const USDC_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_USDC_MINT ?? "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);

/**
 * Safely patches Anchor IDLs by copying instruction accounts into the types array.
 * This ensures compatibility with newer Anchor SDK versions that expect all
 * account structs to be defined as types with a 'kind' field.
 */
function patchIdl(idl: any): any {
  const seenNames = new Set<string>();
  
  const cleanTypes = (idl.types || []).map((t: any) => {
    seenNames.add(t.name);
    if (t.type?.kind) return t; // already valid
    return {
      name: t.name,
      type: { kind: "struct", fields: t.type?.fields || [] }
    };
  });

  const accountTypes = (idl.accounts || [])
    .filter((a: any) => !seenNames.has(a.name))
    .map((a: any) => ({
      name: a.name,
      type: { kind: "struct", fields: a.type?.fields || [] }
    }));

  return { ...idl, types: [...cleanTypes, ...accountTypes] };
}

export function getEscrowProgram(provider: AnchorProvider): Program<Idl> {
  const idl = patchIdl(tradeEscrowIdl) as any;
  // Ensure the IDL has the correct program address
  if (!idl.metadata) idl.metadata = {};
  idl.metadata.address = ESCROW_PROGRAM_ID.toBase58();
  idl.address = ESCROW_PROGRAM_ID.toBase58();
  return new Program(idl as Idl, provider);
}

export function getMarketProgram(provider: AnchorProvider): Program<Idl> {
  const idl = patchIdl(predictionMarketIdl) as any;
  if (!idl.metadata) idl.metadata = {};
  idl.metadata.address = MARKET_PROGRAM_ID.toBase58();
  idl.address = MARKET_PROGRAM_ID.toBase58();
  return new Program(idl as Idl, provider);
}

export function getMarketplaceProgram(provider: AnchorProvider): Program<Idl> {
  const idl = patchIdl(marketplaceIdl) as any;
  if (!idl.metadata) idl.metadata = {};
  idl.metadata.address = MARKETPLACE_PROGRAM_ID.toBase58();
  idl.address = MARKETPLACE_PROGRAM_ID.toBase58();
  return new Program(idl as Idl, provider);
}

import { BorshAccountsCoder } from "@coral-xyz/anchor";

export function getCoder(idl: any) {
  return new BorshAccountsCoder(patchIdl(idl));
}
