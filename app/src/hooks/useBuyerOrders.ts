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
          setOrders([]);
          return;
        }

        // Attempt to fetch trades
        const rows = (await (escrowProgram.account as any).tradeAccount.all()) as TradeRow[];
        const own = rows.filter(
          (r) => (r.account.buyer as PublicKey).toBase58() === wallet.publicKey.toBase58(),
        );
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
    void load();
    const id = setInterval(() => void load(), 10_000);
    return () => clearInterval(id);
  }, [load]);

  return { orders, reload: load, loading, error };
}
