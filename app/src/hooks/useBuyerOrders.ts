'use client';

import { useEffect, useMemo, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useAnchorClient } from "@/hooks/useAnchorClient";
import type { TradeRow } from "./useSellerOrders";

const API = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8080";

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
          console.log("useBuyerOrders: Skipping fetch - missing program or wallet", { 
            hasProgram: !!escrowProgram, 
            hasWallet: !!wallet?.publicKey 
          });
          setOrders([]);
          return;
        }

        console.log("useBuyerOrders: Fetching on-chain trades for", wallet.publicKey.toBase58());
        
        let orders: TradeRow[] = [];
        let useAnchorFetch = true;

        // Try Anchor SDK first
        try {
          const rows = (await (escrowProgram.account as any).tradeAccount.all()) as TradeRow[];
          orders = rows.filter(
            (r) => (r.account.buyer as PublicKey).toBase58() === wallet.publicKey.toBase58(),
          );
          console.log("useBuyerOrders: Anchor SDK fetch succeeded, found", orders.length, "trades");
          useAnchorFetch = false;
        } catch (anchorErr: any) {
          console.warn("useBuyerOrders: Anchor SDK failed:", anchorErr?.message);
          console.log("useBuyerOrders: Falling back to decodeUnchecked + raw accounts...");
          useAnchorFetch = true;
        }

        // Fallback: Use decodeUnchecked with error handling
        if (useAnchorFetch) {
          const connection = escrowProgram.provider.connection;
          const programId = escrowProgram.programId;
          
          console.log("useBuyerOrders: Fetching all program accounts...");
          const accounts = await connection.getProgramAccounts(programId);
          
          console.log(`useBuyerOrders: Found ${accounts.length} program accounts, decoding...`);
          
          for (const { pubkey, account } of accounts) {
            try {
              const decoded = escrowProgram.coder.accounts.decodeUnchecked(
                "tradeAccount", 
                account.data
              );
              
              // Check if buyer matches
              if (decoded.buyer?.toBase58() === wallet.publicKey.toBase58()) {
                orders.push({ 
                  pubkey, 
                  account: decoded 
                } as any);
              }
            } catch (decodeErr: any) {
              // Skip accounts that don't decode — old format or different type
              console.debug("useBuyerOrders: Skipped non-tradeAccount:", decodeErr?.message);
              continue;
            }
          }
          
          console.log("useBuyerOrders: Decoded", orders.length, "trades for this wallet");
        }

        // If still empty, try agent as last resort
        if (orders.length === 0) {
          console.log("useBuyerOrders: No on-chain trades found, checking agent...");
          try {
            const res = await fetch(
              `${API}/api/trades?wallet=${wallet.publicKey.toBase58()}`,
              { signal: AbortSignal.timeout(5000) }
            );
            if (res.ok) {
              const agentTrades = await res.json();
              console.log("useBuyerOrders: Agent returned", agentTrades?.length || 0, "trades");
              // Agent trades already filtered by wallet, map to TradeRow format
              orders = (agentTrades || []).map((trade: any) => ({
                pubkey: new PublicKey(trade.trade_account || "11111111111111111111111111111111"),
                account: {
                  id: trade.trade_id,
                  buyer: new PublicKey(trade.wallet),
                  ...trade
                }
              }));
            }
          } catch (agentErr) {
            console.warn("useBuyerOrders: Agent fetch also failed:", (agentErr as any)?.message);
          }
        }

        setOrders(orders.filter(o => o.pubkey != null));
        setError(null);
      } catch (err: any) {
        console.warn("useBuyerOrders: Unexpected error:", err?.message || err, err?.stack);
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
