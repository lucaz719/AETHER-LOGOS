'use client';

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { SearchBar } from "@/components/SearchBar";
import { CategoryNav } from "@/components/CategoryNav";
import { ProductCard } from "@/components/ProductCard";
import { VendorCard } from "@/components/VendorCard";
import { VendorTypeFilter } from "@/components/VendorTypeFilter";
import { useListings } from "@/hooks/useListings";

function SearchResults() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? undefined;
  const type = searchParams.get("type") ?? undefined;
  const [vendorTypes, setVendorTypes] = useState<string[]>(type ? [type] : []);

  const { listings, loading } = useListings({ search: q, category });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "2rem" }}>
      <aside>
        <VendorTypeFilter selected={vendorTypes} onChange={setVendorTypes} />
      </aside>
      <div>
        <h2 style={{ margin: "0 0 1rem" }}>
          {q ? `Results for "${q}"` : "All Listings"}
          <span style={{ fontWeight: 400, color: "#64748b", fontSize: "0.9rem", marginLeft: "0.5rem" }}>
            ({listings.length} found)
          </span>
        </h2>
        {loading ? (
          <p style={{ color: "#94a3b8" }}>Loading…</p>
        ) : listings.length === 0 ? (
          <p style={{ color: "#94a3b8" }}>No listings found.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
            {listings.map((l) => (
              <ProductCard
                key={l.pubkey}
                pubkey={l.pubkey}
                title={String(l.account.title ?? "")}
                priceUsdc={Number(l.account.price_usdc ?? 0)}
                minOrderQty={Number(l.account.min_order_qty ?? 1)}
                vendorAuthority={typeof l.account.vendor === "string" ? l.account.vendor : ""}
                category={Object.keys(l.account.category as Record<string, unknown>)[0] ?? "Other"}
                imagesCid={l.account.images_cid as string | undefined}
                isActive={Boolean(l.account.is_active)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <SearchBar />
      </div>
      <div style={{ marginBottom: "1.5rem" }}>
        <CategoryNav />
      </div>
      <Suspense fallback={<p>Loading…</p>}>
        <SearchResults />
      </Suspense>
    </main>
  );
}
