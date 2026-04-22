'use client';

import { useCallback, useState } from "react";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import BN from "bn.js";
import { useAnchorClient } from "@/hooks/useAnchorClient";
import { MARKETPLACE_PROGRAM_ID, ESCROW_PROGRAM_ID } from "@/lib/anchor";
import type { CartItem } from "@/hooks/useCart";

const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

function randomBytes(len: number): Uint8Array {
  const buf = new Uint8Array(len);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(buf);
  }
  return buf;
}

function sha256Sync(data: Uint8Array): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", data);
}

export type CheckoutState = "idle" | "signing" | "confirming" | "done" | "error";

export function useCheckout() {
  const { marketplaceProgram, wallet } = useAnchorClient();
  const [state, setState] = useState<CheckoutState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txSigs, setTxSigs] = useState<string[]>([]);

  const checkout = useCallback(
    async (items: CartItem[]) => {
      if (!marketplaceProgram || !wallet?.publicKey) {
        setError("Wallet not connected");
        return;
      }
      setState("signing");
      setError(null);
      const sigs: string[] = [];

      try {
        for (const item of items) {
          const orderIdBytes = randomBytes(16);
          const tradeIdBytes = randomBytes(32);

          const milestoneInput = new Uint8Array([...orderIdBytes, ...new PublicKey(item.listingPubkey).toBytes()]);
          const milestoneHashBuf = await sha256Sync(milestoneInput);
          const milestoneHash = Array.from(new Uint8Array(milestoneHashBuf));

          const buyerKey = wallet.publicKey;
          const vendorAuthority = new PublicKey(item.vendorAuthority);
          const listingKey = new PublicKey(item.listingPubkey);

          const [vendorProfilePda] = PublicKey.findProgramAddressSync(
            [Buffer.from("vendor"), vendorAuthority.toBuffer()],
            MARKETPLACE_PROGRAM_ID,
          );
          const [marketplaceOrderPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("mktorder"), buyerKey.toBuffer(), Buffer.from(orderIdBytes)],
            MARKETPLACE_PROGRAM_ID,
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
          const buyerTokenAccount = await getAssociatedTokenAddress(USDC_MINT, buyerKey);

          setState("confirming");
          const tx = await (marketplaceProgram.methods as any)
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
              buyerTokenAccount,
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
        setError(e instanceof Error ? e.message : String(e));
        setState("error");
      }
    },
    [marketplaceProgram, wallet],
  );

  return { checkout, state, error, txSigs };
}
