'use client';

import { useEffect, useMemo, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useAnchorClient } from "@/hooks/useAnchorClient";

export type TradeRow = {
  pubkey: PublicKey;
  account: Record<string, unknown>;
};

export function useSellerOrders() {
  const { escrowProgram, wallet } = useAnchorClient();
  const [orders, setOrders] = useState<TradeRow[]>([]);

  const load = useMemo(
    () => async () => {
      if (!escrowProgram || !wallet?.publicKey) return;
      const rows = (await (escrowProgram.account as any).tradeAccount.all()) as TradeRow[];
      const own = rows.filter(
        (r) => (r.account.seller as PublicKey).toBase58() === wallet.publicKey.toBase58(),
      );
      setOrders(own);
    },
    [escrowProgram, wallet?.publicKey],
  );

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 10_000);
    return () => clearInterval(id);
  }, [load]);

  return { orders, reload: load };
}
