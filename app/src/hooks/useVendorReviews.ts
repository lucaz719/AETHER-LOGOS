'use client';

import { useEffect, useMemo, useState } from "react";

export type ReviewRow = {
  pubkey: string;
  account: Record<string, unknown>;
};

export function useVendorReviews(vendorAuthority?: string) {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useMemo(
    () => async () => {
      if (!vendorAuthority) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/marketplace/reviews/${vendorAuthority}`);
        if (!res.ok) return;
        const data = await res.json();
        setReviews(data.reviews ?? []);
      } finally {
        setLoading(false);
      }
    },
    [vendorAuthority],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return { reviews, loading, reload: load };
}
