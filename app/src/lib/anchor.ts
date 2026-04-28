import { AnchorProvider, Idl, Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import tradeEscrowIdl from "./idl/trade_escrow.json";
import predictionMarketIdl from "./idl/prediction_market.json";
import marketplaceIdl from "./idl/marketplace.json";

const DEFAULT_ESCROW_PROGRAM_ID = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS";
const DEFAULT_MARKET_PROGRAM_ID = "HmbTLCmaGtYhSJafyMNx2YdAfJvpGAE2x5JRf8kzGiuY";
const DEFAULT_MARKETPLACE_PROGRAM_ID = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnN";

export const ESCROW_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_ESCROW_PROGRAM_ID ?? DEFAULT_ESCROW_PROGRAM_ID,
);
export const MARKET_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_MARKET_PROGRAM_ID ?? DEFAULT_MARKET_PROGRAM_ID,
);
export const MARKETPLACE_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_MARKETPLACE_PROGRAM_ID ?? DEFAULT_MARKETPLACE_PROGRAM_ID,
);

export function getEscrowProgram(provider: AnchorProvider): Program<Idl> {
  return new Program(tradeEscrowIdl as Idl, provider);
}

export function getMarketProgram(provider: AnchorProvider): Program<Idl> {
  return new Program(predictionMarketIdl as Idl, provider);
}

export function getMarketplaceProgram(provider: AnchorProvider): Program<Idl> {
  return new Program(marketplaceIdl as any, provider);
}

import { BorshAccountsCoder } from "@coral-xyz/anchor";

export function getCoder(idl: any) {
  const patchedIdl = { ...idl, types: [...(idl.types || []), ...(idl.accounts || [])] };
  return new BorshAccountsCoder(patchedIdl);
}
