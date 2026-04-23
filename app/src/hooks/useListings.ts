'use client';

import { useEffect, useMemo, useState } from "react";

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
  page?: number;
  limit?: number;
};

export function useListings(filter: ListingFilter = {}) {
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const limit = filter.limit ?? 24;

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
        if (filter.page && filter.page > 1) params.set("offset", String((filter.page - 1) * limit));
        params.set("limit", String(limit + 1)); // fetch one extra to detect hasMore
        const res = await fetch(`/api/marketplace/listings?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        const rows: ListingRow[] = data.listings ?? [];
        if (rows.length > limit) {
          setHasMore(true);
          setListings(rows.slice(0, limit));
        } else {
          setHasMore(false);
          setListings(rows);
        }
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filter.vendor, filter.category, filter.minPrice, filter.maxPrice, filter.search, filter.page, limit],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return { listings, loading, hasMore, reload: load };
}

