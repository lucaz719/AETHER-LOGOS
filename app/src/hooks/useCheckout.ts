'use client';

import { useCallback, useState } from "react";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, type Connection, type Signer } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import BN from "bn.js";
import { useAnchorClient } from "@/hooks/useAnchorClient";
import { MARKET_PROGRAM_ID, ESCROW_PROGRAM_ID } from "@/lib/anchor";
import type { CartItem } from "@/hooks/useCart";

const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

export function resolveSettlementError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (
    /wallet payer is required/i.test(message) ||
    /payer is required/i.test(message) ||
    /insufficient funds/i.test(message) ||
    /insufficient lamports/i.test(message) ||
    /attempt to debit an account/i.test(message) ||
    /not enough sol/i.test(message)
  ) {
    return "Insufficient Devnet SOL for fees";
  }

  return message;
}

export async function ensureAssociatedTokenAccount(
  connection: Connection,
  payer: Signer,
  mint: PublicKey,
  owner: PublicKey,
) {
  return getOrCreateAssociatedTokenAccount(connection, payer, mint, owner);
}

function randomBytes(len: number): Uint8Array {
  const buf = new Uint8Array(len);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(buf);
  }
  return buf;
}

async function sha256Async(data: Uint8Array): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", data as any);
}

export type CheckoutState = "idle" | "signing" | "confirming" | "done" | "error";

export function useCheckout() {
  const { marketProgram, wallet, provider, connection } = useAnchorClient();
  const [state, setState] = useState<CheckoutState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txSigs, setTxSigs] = useState<string[]>([]);

  const checkout = useCallback(
    async (items: CartItem[]) => {
      if (!marketProgram || !wallet?.publicKey) {
        setError("Wallet not connected");
        return;
      }
      setState("signing");
      setError(null);
      const sigs: string[] = [];

      try {
        const payer = (provider?.wallet as { payer?: Signer } | undefined)?.payer;
        if (!payer) {
          throw new Error("wallet payer is required");
        }

        for (const item of items) {
          const orderIdBytes = randomBytes(16);
          const tradeIdBytes = randomBytes(32);

          const milestoneInput = new Uint8Array([...Array.from(orderIdBytes), ...Array.from(new PublicKey(item.listingPubkey).toBytes())]);
          const milestoneHashBuf = await sha256Async(milestoneInput);
          const milestoneHash = Array.from(new Uint8Array(milestoneHashBuf));

          const buyerKey = wallet.publicKey;
          const vendorAuthority = new PublicKey(item.vendorAuthority);
          const listingKey = new PublicKey(item.listingPubkey);

          const [vendorProfilePda] = PublicKey.findProgramAddressSync(
            [Buffer.from("vendor"), vendorAuthority.toBuffer()],
            MARKET_PROGRAM_ID,
          );
          const [marketplaceOrderPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("mktorder"), buyerKey.toBuffer(), Buffer.from(orderIdBytes)],
            MARKET_PROGRAM_ID,
          );
          const [tradeAccountPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("trade"), buyerKey.toBuffer(), Buffer.from(tradeIdBytes)],
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
          const buyerTokenAccount = await ensureAssociatedTokenAccount(
            connection,
            payer,
            USDC_MINT,
            buyerKey,
          );

          setState("confirming");
          const tx = await (marketProgram.methods as any)
            .placeOrder(
              Array.from(orderIdBytes),
              Array.from(tradeIdBytes),
              item.quantity,
              milestoneHash,
            )
            .accounts({
              buyer: buyerKey,
              vendorProfile: vendorProfilePda,
              listing: listingKey,
              marketplaceOrder: marketplaceOrderPda,
              seller: vendorAuthority,
              tradeAccount: tradeAccountPda,
              escrowVault: escrowVaultPda,
              vaultAuthority: vaultAuthorityPda,
              buyerTokenAccount: buyerTokenAccount.address,
              usdcMint: USDC_MINT,
              tradeEscrowProgram: ESCROW_PROGRAM_ID,
              systemProgram: SystemProgram.programId,
              tokenProgram: TOKEN_PROGRAM_ID,
              rent: SYSVAR_RENT_PUBKEY,
            })
            .rpc();
          sigs.push(tx);
        }

        setTxSigs(sigs);
        setState("done");
      } catch (e: unknown) {
        setError(resolveSettlementError(e));
        setState("error");
      }
    },
    [marketProgram, wallet, provider, connection],
  );

  return { checkout, state, error, txSigs };
}
