import { AnchorProvider, Idl, Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import tradeEscrowIdl from "./idl/trade_escrow.json";
import predictionMarketIdl from "./idl/prediction_market.json";

const DEFAULT_ESCROW_PROGRAM_ID = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS";
const DEFAULT_MARKET_PROGRAM_ID = "HmbTLCmaGtYhSJafyMNx2YdAfJvpGAE2x5JRf8kzGiuY";

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

// HACKATHON MOCK - Platform fee recipient wallet
// The on-chain ReleaseFunds instruction doesn't validate this account's owner (bug),
// so we hardcode a devnet wallet here for the demo. Replace with treasury PDA before mainnet.
export const PLATFORM_TREASURY_PUBKEY = new PublicKey(
  process.env.NEXT_PUBLIC_PLATFORM_TREASURY ?? "11111111111111111111111111111111"
);

export function getEscrowProgram(provider: AnchorProvider): Program<Idl> {
  return new Program(tradeEscrowIdl as Idl, provider);
}

export function getMarketProgram(provider: AnchorProvider): Program<Idl> {
  return new Program(predictionMarketIdl as Idl, provider);
}

import { BorshAccountsCoder } from "@coral-xyz/anchor";

export function getCoder(idl: any) {
  const patchedIdl = { ...idl, types: [...(idl.types || []), ...(idl.accounts || [])] };
  return new BorshAccountsCoder(patchedIdl);
}
