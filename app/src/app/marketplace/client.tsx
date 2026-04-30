'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductCard } from '@/components/ProductCard';
import { VendorCard } from '@/components/VendorCard';

// ─── Types ──────────────────────────────────────────────────────────────────

type ListingRecord = { pubkey: string; account: Record<string, unknown> };
type VendorRecord  = { pubkey: string; account: Record<string, unknown> };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pkStr(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && 'toBase58' in (v as Record<string, unknown>)) {
    return (v as { toBase58(): string }).toBase58();
  }
  return String(v ?? '');
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function catKeyStr(cat: unknown): string {
  if (!cat || typeof cat !== 'object') return 'Other';
  const key = Object.keys(cat as Record<string, unknown>)[0] ?? 'other';
  return capitalize(key);
}

function vtKeyStr(vt: unknown): string {
  if (!vt || typeof vt !== 'object') return 'Other';
  const key = Object.keys(vt as Record<string, unknown>)[0] ?? 'other';
  return capitalize(key);
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: '',             label: 'All Categories', icon: '🌐' },
  { value: 'electronics',  label: 'Electronics',    icon: '⚡' },
  { value: 'apparel',      label: 'Apparel',         icon: '👗' },
  { value: 'homeGoods',    label: 'Home Goods',      icon: '🏠' },
  { value: 'machinery',    label: 'Machinery',       icon: '⚙️' },
  { value: 'foodBeverage', label: 'Food & Beverage', icon: '🍎' },
  { value: 'chemicals',    label: 'Chemicals',       icon: '🧪' },
  { value: 'automotive',   label: 'Automotive',      icon: '🚗' },
  { value: 'healthcare',   label: 'Healthcare',      icon: '💊' },
  { value: 'construction', label: 'Construction',    icon: '🏗️' },
  { value: 'other',        label: 'Other',           icon: '📦' },
];

const PAGE_SIZE = 20;

// ─── Component ───────────────────────────────────────────────────────────────

export default function MarketplaceBrowseClient() {
  const searchParams = useSearchParams();

  const [listings,       setListings]       = useState<ListingRecord[]>([]);
  const [vendorMap,      setVendorMap]      = useState<Map<string, VendorRecord>>(new Map());
  const [featuredVendors,setFeaturedVendors]= useState<VendorRecord[]>([]);
  const [total,          setTotal]          = useState(0);
  const [loading,        setLoading]        = useState(true);

  // local filter state
  const [category, setCategory] = useState('');
  const [sort,     setSort]     = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [page,     setPage]     = useState(1);

  // Load featured vendors once on mount
  useEffect(() => {
    fetch('/api/marketplace/vendors?page=1')
      .then((r) => (r.ok ? r.json() : { vendors: [] }))
      .then((d) => setFeaturedVendors((d.vendors ?? []).slice(0, 4)))
      .catch(() => {});
  }, []);

  // Re-fetch listings whenever filters change
  useEffect(() => {
    const q = searchParams.get('q') ?? '';
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (category) params.set('category', category);
        if (sort)     params.set('sort', sort);
        if (minPrice) params.set('minPrice', minPrice);
        if (maxPrice) params.set('maxPrice', maxPrice);
        if (q)        params.set('search', q);
        params.set('page', String(page));

        const res = await fetch(`/api/marketplace/listings?${params}`);
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        const items: ListingRecord[] = data.listings ?? [];
        setListings(items);
        setTotal(data.total ?? 0);

        // Enrich with vendor profiles (single parallel batch)
        const addrs = Array.from(new Set(items.map((l) => pkStr(l.account.vendor))));
        const vendorRes = await fetch(`/api/marketplace/vendors?page=1`);
        if (vendorRes.ok) {
          const vendorData = await vendorRes.json();
          const map = new Map<string, VendorRecord>();
          for (const v of (vendorData.vendors ?? []) as VendorRecord[]) {
            map.set(pkStr(v.account.authority), v);
          }
          setVendorMap(map);
        }
        void addrs; // consumed above via the map
      } catch {
        setListings([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [category, sort, minPrice, maxPrice, page, searchParams]);

  const handleCategory = useCallback((cat: string) => {
    setCategory(cat);
    setPage(1);
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>

      {/* ── Left Sidebar ─────────────────────────────────────────────── */}
      <aside
        className="glass"
        style={{
          width: 200,
          flexShrink: 0,
          padding: '1rem',
          display: 'grid',
          gap: '0.25rem',
          position: 'sticky',
          top: 80,
        }}
      >
        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
          Categories
        </p>
        {CATEGORIES.map((cat) => {
          const active = category === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() => handleCategory(cat.value)}
              style={{
                textAlign: 'left',
                padding: '0.45rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: active ? 'var(--cyan-dim)' : 'transparent',
                color: active ? 'var(--cyan)' : 'var(--text-secondary)',
                fontWeight: active ? 700 : 400,
                fontSize: '0.83rem',
                cursor: 'pointer',
                transition: 'background var(--transition), color var(--transition)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          );
        })}

        {/* Price filter */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '0.75rem', paddingTop: '0.75rem', display: 'grid', gap: '0.5rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Price (USDC)
          </p>
          <input
            className="input"
            type="number"
            min={0}
            placeholder="Min"
            value={minPrice}
            onChange={(e) => { setMinPrice(e.target.value); setPage(1); }}
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}
          />
          <input
            className="input"
            type="number"
            min={0}
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}
          />
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Featured Suppliers strip */}
        {featuredVendors.length > 0 && (
          <section style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                ⭐ Featured Suppliers
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>On-chain verified</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
              {featuredVendors.map((v) => {
                const acct = v.account;
                const authority = pkStr(acct.authority);
                return (
                  <VendorCard
                    key={v.pubkey}
                    authority={authority}
                    shopName={String(acct.shop_name ?? '')}
                    shopDescription={String(acct.shop_description ?? '')}
                    vendorType={vtKeyStr(acct.vendor_type)}
                    isVerified={Boolean(acct.is_verified)}
                    ratingSum={Number(acct.rating_sum ?? 0)}
                    ratingCount={Number(acct.rating_count ?? 0)}
                    totalSales={Number(acct.total_sales ?? 0)}
                    logoCid={typeof acct.logo_cid === 'string' ? acct.logo_cid : undefined}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* Toolbar: result count + sort */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {loading ? '…' : `${total.toLocaleString()} product${total !== 1 ? 's' : ''}`}
            </span>
            {category && (
              <span className="badge badge-cyan" style={{ cursor: 'pointer' }} onClick={() => handleCategory('')}>
                {CATEGORIES.find((c) => c.value === category)?.label} ✕
              </span>
            )}
          </div>
          <select
            className="input"
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
            style={{ fontSize: '0.83rem', padding: '0.35rem 0.75rem', minWidth: 160 }}
          >
            <option value="">Best Match</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
          </select>
        </div>

        {/* Trust badges bar (Alibaba-style) */}
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
            marginBottom: '1.25rem',
            padding: '0.6rem 1rem',
            background: 'rgba(0,212,255,0.04)',
            border: '1px solid rgba(0,212,255,0.12)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.78rem',
          }}
        >
          {[
            { icon: '🔒', text: 'On-Chain Escrow' },
            { icon: '✓', text: 'Verified Suppliers' },
            { icon: '⚡', text: 'Solana Speed' },
            { icon: '🌐', text: '220+ Countries' },
          ].map((b) => (
            <span key={b.text} style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ color: 'var(--cyan)' }}>{b.icon}</span> {b.text}
            </span>
          ))}
        </div>

        {/* Product grid */}
        {loading ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="glass" style={{ height: 300, borderRadius: 'var(--radius-md)' }}>
                <div className="skeleton" style={{ height: 180, borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0' }} />
                <div style={{ padding: '0.75rem', display: 'grid', gap: '0.5rem' }}>
                  <div className="skeleton" style={{ height: 16, width: '80%' }} />
                  <div className="skeleton" style={{ height: 14, width: '60%' }} />
                  <div className="skeleton" style={{ height: 28, width: '40%', marginTop: '0.25rem' }} />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div
            className="glass"
            style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
            <p style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>No tokenized listings found.</p>
            <p style={{ fontSize: '0.85rem' }}>
              Vendors can create on-chain listings from the{' '}
              <a href="/vendor/listings/new" style={{ color: 'var(--cyan)' }}>Vendor Dashboard</a>.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {listings.map((listing) => {
              const acct = listing.account;
              const vendorAddr = pkStr(acct.vendor);
              const vendor = vendorMap.get(vendorAddr);
              return (
                <ProductCard
                  key={listing.pubkey}
                  pubkey={listing.pubkey}
                  title={String(acct.title ?? '')}
                  priceUsdc={Number(acct.price_usdc ?? 0)}
                  minOrderQty={Number(acct.min_order_qty ?? 1)}
                  maxOrderQty={acct.max_order_qty != null ? Number(acct.max_order_qty) : undefined}
                  vendorName={vendor ? String(vendor.account.shop_name ?? '') : undefined}
                  vendorAuthority={vendorAddr}
                  category={catKeyStr(acct.category)}
                  imagesCid={typeof acct.images_cid === 'string' ? acct.images_cid : undefined}
                  isActive={Boolean(acct.is_active)}
                  stockQuantity={acct.stock != null ? Number(acct.stock) : undefined}
                />
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && !loading && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem', flexWrap: 'wrap' }}>
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="btn-ghost"
              style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
            >
              ← Prev
            </button>
            {Array.from({ length: Math.min(7, totalPages) }).map((_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    border: p === page ? '1px solid var(--cyan)' : '1px solid var(--border)',
                    background: p === page ? 'var(--cyan-dim)' : 'transparent',
                    color: p === page ? 'var(--cyan)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {p}
                </button>
              );
            })}
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="btn-ghost"
              style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
