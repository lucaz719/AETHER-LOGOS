'use client';

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { SearchBar } from "@/components/SearchBar";
import { CategoryNav } from "@/components/CategoryNav";
import { ProductCard } from "@/components/ProductCard";
import { VendorCard } from "@/components/VendorCard";
import { FilterPanel } from "@/components/FilterPanel";
import { SortDropdown } from "@/components/SortDropdown";
import { EmptyState } from "@/components/EmptyState";
import { ProductCardSkeleton } from "@/components/Skeleton";
import { useListings } from "@/hooks/useListings";

function SearchResults() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? undefined;
  const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
  const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;
  const sort = searchParams.get("sort") ?? undefined;
  const type = searchParams.get("type") ?? undefined;
  
  const [vendorTypes, setVendorTypes] = useState<string[]>(type ? [type] : []);
  const [page, setPage] = useState(1);

  const { listings, loading, hasMore } = useListings({ search: q, category, minPrice, maxPrice, sort, page });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "250px 1fr", gap: "2.5rem" }}>
      <aside>
        <FilterPanel selectedTypes={vendorTypes} onTypesChange={setVendorTypes} />
      </aside>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {q ? `Results for "${q}"` : "All Listings"}
            {!loading && (
              <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: "0.85rem", marginLeft: "0.5rem" }}>
                ({listings.length} found)
              </span>
            )}
          </h2>
          <SortDropdown />
        </div>
        {loading ? (
          <div className="listing-grid">
            {[0, 1, 2, 3, 4, 5].map((i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : listings.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="No results found"
            message={q ? `We couldn't find any listings matching "${q}". Try adjusting your filters or search terms.` : "No listings match the selected filters."}
            action={q ? { label: "Clear Search", href: "/marketplace/search" } : undefined}
          />
        ) : (
          <>
            <div className="listing-grid">
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
          <div className="listing-grid">
            {[0, 1, 2, 3].map((i) => <ProductCardSkeleton key={i} />)}
          </div>
        }
      >
        <SearchResults />
      </Suspense>
    </main>
  );
}

