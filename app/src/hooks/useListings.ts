'use client';

import { useEffect, useMemo, useState } from "react";
import { PublicKey } from "@solana/web3.js";

export type ListingRow = {
  pubkey: string;
  account: Record<string, unknown>;
};

export type ListingFilter = {
  vendor?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
};

export function useListings(filter: ListingFilter = {}) {
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useMemo(
    () => async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filter.vendor) params.set("vendor", filter.vendor);
        if (filter.category) params.set("category", filter.category);
        if (filter.minPrice !== undefined) params.set("minPrice", String(filter.minPrice));
        if (filter.maxPrice !== undefined) params.set("maxPrice", String(filter.maxPrice));
        if (filter.search) params.set("search", filter.search);
        const res = await fetch(`/api/marketplace/listings?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        setListings(data.listings ?? []);
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filter.vendor, filter.category, filter.minPrice, filter.maxPrice, filter.search],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return { listings, loading, reload: load };
}
