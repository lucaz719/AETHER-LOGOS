'use client';

import { useEffect, useCallback, useState } from "react";

export type MarketplaceOrderRow = {
  pubkey: string;
  account: Record<string, unknown>;
};

export function useMarketplaceOrders(role: "buyer" | "vendor", pubkey?: string) {
  const [orders, setOrders] = useState<MarketplaceOrderRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async () => {
      if (!pubkey) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/marketplace/orders?${role}=${pubkey}`);
        if (!res.ok) return;
        const data = await res.json();
        setOrders(data.orders ?? []);
      } finally {
        setLoading(false);
      }
    },
    [role, pubkey],
  );

  useEffect(() => {
    void load();
    const id = setInterval(() => {
      if (!document.hidden) void load();
    }, 15_000);
    return () => clearInterval(id);
  }, [load]);

  return { orders, loading, reload: load };
}
