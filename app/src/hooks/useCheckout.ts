'use client';

import { useCallback, useState } from "react";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction, type Connection } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import BN from "bn.js";
import { useAnchorClient } from "@/hooks/useAnchorClient";
import { useToast } from "@/hooks/useToast";
import { MARKET_PROGRAM_ID, ESCROW_PROGRAM_ID } from "@/lib/anchor";
import type { CartItem } from "@/hooks/useCart";
import { AGENT_URL } from "@/lib/config";

const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

export function resolveSettlementError(error: unknown, usdcBalance?: number, grandTotal?: number): string {
  const message = error instanceof Error ? error.message : String(error);

  // HACKATHON MOCK - differentiate between USDC and SOL shortages
  // Real fix: fetch SOL balance and check against 0.0041 threshold
  if (
    /insufficient funds|insufficient lamports|attempt to debit|not enough sol/i.test(message)
  ) {
    // If USDC balance is known and insufficient, show USDC error
    if (usdcBalance !== undefined && grandTotal !== undefined && usdcBalance < grandTotal) {
      return `Insufficient USDC balance. You need $${(grandTotal - usdcBalance).toFixed(2)} more. Get devnet USDC at spl-token-faucet.com`;
    }
    
    // Otherwise assume it's a SOL fee issue
    return "Insufficient SOL for transaction fees (~0.005 SOL). Get devnet SOL at faucet.solana.com";
  }

  return message;
}

export async function ensureAssociatedTokenAccount(
  connection: Connection,
  payer: PublicKey,
  mint: PublicKey,
  owner: PublicKey,
  signTransaction: (tx: Transaction) => Promise<Transaction>,
  sendRawTransaction: (raw: Buffer) => Promise<string>,
): Promise<PublicKey> {
  const ata = getAssociatedTokenAddressSync(mint, owner);
  const ataInfo = await connection.getAccountInfo(ata);
  if (!ataInfo) {
    const createAtaIx = createAssociatedTokenAccountInstruction(payer, ata, owner, mint);
    const tx = new Transaction().add(createAtaIx);
    tx.feePayer = payer;
    const { blockhash } = await connection.getLatestBlockhash('finalized');
    tx.recentBlockhash = blockhash;
    const signed = await signTransaction(tx);
    const txid = await sendRawTransaction(Buffer.from(signed.serialize()));
    await connection.confirmTransaction(txid, 'confirmed');
  }
  return ata;
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
  const { info } = useToast();
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
         // For Phantom: use wallet.publicKey as buyer; skip local payer check.
         // Assume ATA exists (created on Store page "Create ATA" button).

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
           
           const mintPub = new PublicKey(item.usdcMint ?? USDC_MINT.toBase58());
           const buyerTokenAta = getAssociatedTokenAddressSync(mintPub, buyerKey);

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
               buyerTokenAccount: buyerTokenAta,
               usdcMint: mintPub,
               tradeEscrowProgram: ESCROW_PROGRAM_ID,
               systemProgram: SystemProgram.programId,
               tokenProgram: TOKEN_PROGRAM_ID,
               rent: SYSVAR_RENT_PUBKEY,
             })
             .rpc();
           sigs.push(tx);

           // After on-chain transaction succeeds, try to register with agent
           // This is a best-effort call—if it fails, the trade still exists on-chain
           try {
             const tradeIdHex = Array.from(tradeIdBytes).map(b => b.toString(16).padStart(2, '0')).join('');
             await fetch(`${AGENT_URL}/api/register`, {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({
                trade_id: tradeIdHex,
                wallet: buyerKey.toBase58(),
                carrier: "dhl",
                trade_account: tradeAccountPda.toBase58(),
                seller: vendorAuthority.toBase58(),
                amount: String(item.priceUsdc * item.quantity),
                product_title: item.title ?? "",
                tracking_id: "",
                callback_url: `${typeof window !== 'undefined' ? window.location.origin : ''}/api/shipment-update`,
              }),
             }).catch(err => {
               console.warn("Agent registration failed (non-blocking):", err);
             });
           } catch (err) {
             console.warn("Failed to register trade with agent:", err);
           }
         }

         setTxSigs(sigs);
         setState("done");
         // Show info toast if agent might be delayed
         info("Trade committed on-chain ✅ — dashboard sync in progress ⏳", 5000);
       } catch (e: unknown) {
         setError(resolveSettlementError(e));
         setState("error");
       }
    },
    [marketProgram, wallet, provider, connection, info],
  );

  return { checkout, state, error, txSigs };
}
