'use client';

import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useAnchorClient } from "./useAnchorClient";

type TradeAccountValue = Record<string, unknown> | null;

export function useTradeAccount(pubkey?: string) {
  const { escrowProgram } = useAnchorClient();
  const [trade, setTrade] = useState<TradeAccountValue>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!escrowProgram || !pubkey) {
      setTrade(null);
      return;
    }
    let active = true;
    let listener: number | null = null;
    const accountKey = new PublicKey(pubkey);

    const load = async () => {
      setLoading(true);
      try {
        const value = (await (escrowProgram.account as any).tradeAccount.fetch(accountKey)) as Record<string, unknown>;
        if (active) {
          setTrade(value);
          setError(null);
        }
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to fetch trade account");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    listener = escrowProgram.provider.connection.onAccountChange(accountKey, () => {
      void load();
    });

    return () => {
      active = false;
      if (listener !== null) {
        void escrowProgram.provider.connection.removeAccountChangeListener(listener);
      }
    };
  }, [escrowProgram, pubkey]);

  return { trade, loading, error };
}
