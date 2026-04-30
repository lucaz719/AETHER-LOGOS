'use client';

import { useEffect, useCallback, useState } from "react";
import { useAnchorClient } from "@/hooks/useAnchorClient";

export type TradeRow = {
  pubkey: import("@solana/web3.js").PublicKey;
  account: Record<string, unknown>;
};

export function useSellerOrders() {
  const { escrowProgram, wallet } = useAnchorClient();
  const [orders, setOrders] = useState<TradeRow[]>([]);

  // Offset 72 = 8 (discriminator) + 32 (trade_id) + 32 (buyer) → seller pubkey field
  const load = useCallback(
    async () => {
      if (!escrowProgram || !wallet?.publicKey) return;
      const rows = (await (escrowProgram.account as any).tradeAccount.all([
        { memcmp: { offset: 72, bytes: wallet.publicKey.toBase58() } },
      ])) as TradeRow[];
      setOrders(rows);
    },
    [escrowProgram, wallet?.publicKey],
  );

  useEffect(() => {
    void load();
    const id = setInterval(() => {
      if (!document.hidden) void load();
    }, 10_000);
    return () => clearInterval(id);
  }, [load]);

  return { orders, reload: load };
}
