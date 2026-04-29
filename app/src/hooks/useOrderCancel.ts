'use client';

import { useCallback, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useAnchorClient } from "@/hooks/useAnchorClient";
import { MARKET_PROGRAM_ID } from "@/lib/anchor";

export type CancelState = "idle" | "signing" | "confirming" | "done" | "error";

export function useOrderCancel() {
  const { marketProgram, wallet } = useAnchorClient();
  const [state, setState] = useState<CancelState>("idle");
  const [error, setError] = useState<string | null>(null);

  const cancelOrder = useCallback(
    async (orderPubkey: string, orderId: number[], tradeAccount: string) => {
      if (!marketProgram || !wallet?.publicKey) {
        setError("Wallet not connected");
        return false;
      }
      setState("signing");
      setError(null);
      try {
        const [orderPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("mktorder"), wallet.publicKey.toBuffer(), Buffer.from(orderId)],
          MARKET_PROGRAM_ID,
        );
        setState("confirming");
        await (marketProgram.methods as any)
          .cancelOrder(orderId)
          .accounts({
            buyer: wallet.publicKey,
            marketplaceOrder: orderPda,
            tradeAccount: new PublicKey(tradeAccount),
          })
          .rpc();
        setState("done");
        return true;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(anchorErrorMsg(msg));
        setState("error");
        return false;
      }
    },
    [marketProgram, wallet],
  );

  return { cancelOrder, state, error };
}

// Map common Anchor / marketplace error codes to readable messages.
function anchorErrorMsg(raw: string): string {
  const MAP: Record<string, string> = {
    "6011": "Trade must be in Cancelled status to cancel this order.",
    "6013": "Order is already finalized.",
    "6016": "You are not authorized to cancel this order.",
    TradeNotCancelled: "Trade must be in Cancelled status to cancel this order.",
    OrderAlreadyFinalized: "Order is already finalized.",
    Unauthorized: "You are not authorized to cancel this order.",
  };
  for (const [key, msg] of Object.entries(MAP)) {
    if (raw.includes(key)) return msg;
  }
  return raw;
}
