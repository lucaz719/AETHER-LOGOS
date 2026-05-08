'use client';

import { useState } from 'react';
import { ProductCard } from '@/components/ProductCard';

type Listing = {
  pubkey: string;
  account: any;
};

type Review = {
  pubkey: string;
  account: any;
};

export function VendorTabs({
  listings,
  reviews,
  vendorName,
  vendorAuthority,
}: {
  listings: Listing[];
  reviews: Review[];
  vendorName: string;
  vendorAuthority: string;
}) {
  const [activeTab, setActiveTab] = useState<'listings' | 'reviews'>('listings');
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  const paginatedListings = listings.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(listings.length / itemsPerPage);

  return (
    <div>
      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
        <button
          onClick={() => { setActiveTab('listings'); setPage(1); }}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'listings' ? 'var(--cyan)' : 'var(--text-muted)',
            fontWeight: activeTab === 'listings' ? 700 : 400,
            paddingBottom: '0.75rem',
            borderBottom: activeTab === 'listings' ? '2px solid var(--cyan)' : '2px solid transparent',
            cursor: 'pointer',
            fontSize: '1.05rem',
          }}
        >
          Listings ({listings.length})
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'reviews' ? 'var(--cyan)' : 'var(--text-muted)',
            fontWeight: activeTab === 'reviews' ? 700 : 400,
            paddingBottom: '0.75rem',
            borderBottom: activeTab === 'reviews' ? '2px solid var(--cyan)' : '2px solid transparent',
            cursor: 'pointer',
            fontSize: '1.05rem',
          }}
        >
          Reviews ({reviews.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'listings' ? (
        <section>
          {listings.length === 0 ? (
            <div className="glass" style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>No listings</div>
              <p>No listings yet from this vendor.</p>
            </div>
          ) : (
            <>
              <div className="listing-grid">
                {paginatedListings.map((l) => (
                  <ProductCard
                    key={l.pubkey}
                    pubkey={l.pubkey}
                    title={String(l.account.title ?? "")}
                    priceUsdc={Number(l.account.price_usdc ?? 0)}
                    minOrderQty={Number(l.account.min_order_qty ?? 1)}
                    vendorName={vendorName}
                    vendorAuthority={vendorAuthority}
                    category={Object.keys(l.account.category ?? {})[0] ?? "Other"}
                    imagesCid={l.account.images_cid as string | undefined}
                    isActive={Boolean(l.account.is_active)}
                  />
                ))}
              </div>
              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '2rem' }}>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-ghost"
                    style={{ padding: '0.4rem 1rem' }}
                  >
                    ← Prev
                  </button>
                  <span style={{ color: 'var(--text-muted)', alignSelf: 'center', fontSize: '0.85rem' }}>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn-ghost"
                    style={{ padding: '0.4rem 1rem' }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      ) : (
        <section>
          {reviews.length === 0 ? (
            <div className="glass" style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
              <p>No reviews yet for this vendor.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {reviews.map((r) => {
                const rating = Number(r.account.rating ?? 0);
                const reviewer = r.account.reviewer?.toString() || '';
                const createdAt = r.account.created_at ? new Date(Number(r.account.created_at) * 1000).toLocaleDateString() : "";
                return (
                  <div key={r.pubkey} className="glass" style={{ padding: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                      <span style={{ color: "var(--amber)", fontSize: "1rem", display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--amber)' }} xmlns="http://www.w3.org/2000/svg"><path d="M12 .587l3.668 7.431L24 9.753l-6 5.848L19.335 24 12 19.897 4.665 24 6 15.601 0 9.753l8.332-1.735z"/></svg>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{rating}</span>
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{createdAt}</span>
                    </div>
                    {reviewer && <div className="addr" style={{ fontSize: "0.7rem" }}>by {reviewer.slice(0, 8)}…{reviewer.slice(-8)}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
