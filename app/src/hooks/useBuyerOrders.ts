'use client';

import { useEffect, useMemo, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useAnchorClient } from "@/hooks/useAnchorClient";
import type { TradeRow } from "./useSellerOrders";

export function useBuyerOrders() {
  const { escrowProgram, wallet } = useAnchorClient();
  const [orders, setOrders] = useState<TradeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useMemo(
    () => async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!escrowProgram || !wallet?.publicKey) {
          console.log("useBuyerOrders: Skipping fetch - missing program or wallet", { hasProgram: !!escrowProgram, hasWallet: !!wallet?.publicKey });
          setOrders([]);
          return;
        }

        console.log("useBuyerOrders: Fetching on-chain trades for", wallet.publicKey.toBase58());
        // Fetch trades directly from on-chain
        // This bypasses the agent DB and ensures trades show up regardless of agent sync status
        const rows = (await (escrowProgram.account as any).tradeAccount.all()) as TradeRow[];
        const own = rows.filter(
          (r) => (r.account.buyer as PublicKey).toBase58() === wallet.publicKey.toBase58(),
        );
        console.log("useBuyerOrders: Found", own.length, "trades for this wallet");
        setOrders(own);
        setError(null);
      } catch (err: any) {
        console.warn("Failed to load buyer orders:", err?.message || err);
        // Gracefully fall back to empty list on fetch failure
        setOrders([]);
        setError(err?.message || "Failed to load orders");
      } finally {
        setLoading(false);
      }
    },
    [escrowProgram, wallet?.publicKey],
  );

  useEffect(() => {
    // Only fetch if wallet and program are ready
    if (!wallet?.publicKey || !escrowProgram) {
      return;
    }
    void load();
    const id = setInterval(() => void load(), 10_000);
    return () => clearInterval(id);
  }, [load, wallet?.publicKey, escrowProgram]);

  return { orders, reload: load, loading, error };
}
