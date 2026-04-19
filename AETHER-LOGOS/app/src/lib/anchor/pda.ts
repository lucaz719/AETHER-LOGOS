import { PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { TRADE_ESCROW_PROGRAM_ID, PREDICTION_MARKET_PROGRAM_ID } from '../constants';

/**
 * Derives the PDA for a Trade Account.
 */
export const getTradePda = (buyer: PublicKey, tradeId: number[] | Uint8Array) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('trade'),
      buyer.toBuffer(),
      Buffer.from(tradeId)
    ],
    TRADE_ESCROW_PROGRAM_ID
  );
};

/**
 * Derives the PDA for an Escrow Vault.
 */
export const getVaultPda = (tradeId: number[] | Uint8Array) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('vault'),
      Buffer.from(tradeId)
    ],
    TRADE_ESCROW_PROGRAM_ID
  );
};

/**
 * Derives the PDA for the Vault Authority.
 */
export const getVaultAuthorityPda = () => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('authority')],
    TRADE_ESCROW_PROGRAM_ID
  );
};

/**
 * Derives the PDA for a Prediction Market Account.
 */
export const getMarketPda = (shipmentTwin: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('market'),
      shipmentTwin.toBuffer()
    ],
    PREDICTION_MARKET_PROGRAM_ID
  );
};

/**
 * Derives the PDA for a Prediction Market Vault.
 */
export const getMarketVaultPda = (market: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('market_vault'),
      market.toBuffer()
    ],
    PREDICTION_MARKET_PROGRAM_ID
  );
};

/**
 * Derives the PDA for a Prediction Market Authority.
 */
export const getMarketAuthorityPda = (market: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('market_authority'),
      market.toBuffer()
    ],
    PREDICTION_MARKET_PROGRAM_ID
  );
};

/**
 * Derives the PDA for a User's Hedge Position.
 */
export const getPositionPda = (market: PublicKey, user: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('position'),
      market.toBuffer(),
      user.toBuffer()
    ],
    PREDICTION_MARKET_PROGRAM_ID
  );
};
