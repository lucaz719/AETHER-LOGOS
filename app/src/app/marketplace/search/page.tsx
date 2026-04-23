'use client';

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { SearchBar } from "@/components/SearchBar";
import { CategoryNav } from "@/components/CategoryNav";
import { ProductCard } from "@/components/ProductCard";
import { VendorCard } from "@/components/VendorCard";
import { VendorTypeFilter } from "@/components/VendorTypeFilter";
import { ProductCardSkeleton, VendorCardSkeleton } from "@/components/Skeleton";
import { useListings } from "@/hooks/useListings";

function SearchResults() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? undefined;
  const type = searchParams.get("type") ?? undefined;
  const [vendorTypes, setVendorTypes] = useState<string[]>(type ? [type] : []);
  const [page, setPage] = useState(1);

  const { listings, loading, hasMore } = useListings({ search: q, category, page });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "2rem" }}>
      <aside>
        <VendorTypeFilter selected={vendorTypes} onChange={setVendorTypes} />
      </aside>
      <div>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1.25rem" }}>
          {q ? `Results for "${q}"` : "All Listings"}
          {!loading && (
            <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: "0.85rem", marginLeft: "0.5rem" }}>
              ({listings.length} found)
            </span>
          )}
        </h2>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "1rem" }}>
            {[0, 1, 2, 3, 4, 5].map((i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : listings.length === 0 ? (
          <div className="glass" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🔍</div>
            <p>No listings found{q ? ` for "${q}"` : ""}.</p>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "1rem" }}>
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
            {/* Pagination */}
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "2rem" }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-ghost"
                style={{ padding: "0.4rem 1rem" }}
              >
                ← Prev
              </button>
              <span style={{ color: "var(--text-muted)", alignSelf: "center", fontSize: "0.85rem" }}>
                Page {page}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore}
                className="btn-ghost"
                style={{ padding: "0.4rem 1rem" }}
              >
                Next →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <main className="page-container">
      <div style={{ marginBottom: "1.25rem" }}>
        <SearchBar />
      </div>
      <div style={{ marginBottom: "1.5rem" }}>
        <CategoryNav />
      </div>
      <Suspense
        fallback={
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "1rem" }}>
            {[0, 1, 2, 3].map((i) => <ProductCardSkeleton key={i} />)}
          </div>
        }
      >
        <SearchResults />
      </Suspense>
    </main>
  );
}

