'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock3, Heart, Repeat2, ShieldCheck, Star, Store } from "lucide-react";
import { MOCK_STORES, type PublicStore, vendorTypeToSellerTier } from "@/lib/data/mockStores";

const API = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8080";
const FOLLOWED_STORES_KEY = "aether_followed_stores";

type StoreFilter = "all" | "manufacturer" | "distributor" | "wholesaler";
type StoreListItem = Omit<PublicStore, "products"> & { source: "api" | "mock" };

const FILTERS: Array<{ label: string; value: StoreFilter }> = [
  { label: "All", value: "all" },
  { label: "Manufacturer", value: "manufacturer" },
  { label: "Distributor", value: "distributor" },
  { label: "Wholesaler", value: "wholesaler" },
];

const VENDOR_TYPE_COLORS: Record<string, { bg: string; color: string; border: string; activeColor?: string }> = {
  Manufacturer: { bg: "rgba(249,115,22,0.12)", color: "#fb923c", border: "rgba(249,115,22,0.3)", activeColor: "#F97316" },
  Wholesaler: { bg: "rgba(168,85,247,0.12)", color: "#a78bfa", border: "rgba(168,85,247,0.3)", activeColor: "#A855F7" },
  Distributor: { bg: "rgba(6,182,212,0.12)", color: "#22d3ee", border: "rgba(6,182,212,0.3)", activeColor: "#06B6D4" },
};

function toVendorType(value?: string): PublicStore["vendorType"] {
  const v = (value ?? "").toLowerCase();
  if (v === "manufacturer") return "Manufacturer";
  if (v === "distributor") return "Distributor";
  return "Wholesaler";
}

function avgRating(ratingSum: number, ratingCount: number) {
  if (ratingCount <= 0) return 0;
  return ratingSum / ratingCount;
}

function starRow(ratingSum: number, ratingCount: number) {
  const avg = avgRating(ratingSum, ratingCount);
  const filled = Math.round(avg);
  return (
    <span style={{ color: "var(--amber)", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.2rem" }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} style={{ opacity: s <= filled ? 1 : 0.25, fontSize: "0.75rem" }}>★</span>
      ))}
      <small style={{ color: "#A3A3A3", marginLeft: "0.2rem", fontSize: "0.6875rem" }}>
        {ratingCount > 0 ? avg.toFixed(1) : "—"} ({ratingCount})
      </small>
    </span>
  );
}

function initialsAvatar(name: string, size = 36) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const hue = name.charCodeAt(0) % 360;
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "var(--radius-sm)",
        background: `hsl(${hue},50%,18%)`,
        border: `1px solid hsl(${hue},50%,30%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: size * 0.34,
        color: `hsl(${hue},60%,70%)`,
        flexShrink: 0,
      }}
    >
      {initials || "?"}
    </div>
  );
}

function computeStoreIdFromWallet(wallet: string) {
  return `vendor-${wallet.slice(0, 8)}`;
}

function parseCategories(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function parseYear(raw: unknown): string {
  if (typeof raw !== "string" || raw.length < 4) return "2023";
  return raw.slice(0, 4);
}

async function fetchStoresForWallet(wallet: string) {
  const storesRes = await fetch(`${API}/api/vendors/${wallet}/stores`);
  if (!storesRes.ok) return null;
  const storesPayload = (await storesRes.json()) as { stores?: Array<Record<string, unknown>> };
  const firstStore = storesPayload.stores?.[0];
  if (!firstStore) return null;
  return firstStore;
}

function fromMockStores(): StoreListItem[] {
  return MOCK_STORES.map((store) => {
    const { products: _products, ...rest } = store;
    return { ...rest, source: "mock" as const };
  });
}

async function fetchVendorCandidatesFromProducts() {
  const productsRes = await fetch(`${API}/api/products`);
  if (!productsRes.ok) return [];
  const productsPayload = (await productsRes.json()) as { products?: Array<{ vendor_wallet?: string }> };
  const wallets = Array.from(new Set((productsPayload.products ?? []).map((item) => item.vendor_wallet).filter(Boolean))) as string[];
  const vendorRows = await Promise.all(
    wallets.map(async (wallet) => {
      const res = await fetch(`${API}/api/vendor/${wallet}`);
      if (!res.ok) return { wallet };
      const payload = (await res.json()) as Record<string, unknown>;
      return { ...payload, wallet };
    })
  );
  return vendorRows;
}

async function fetchStoreListFromApi(): Promise<StoreListItem[]> {
  let vendors: Array<Record<string, unknown>> = [];

  try {
    const vendorsRes = await fetch(`${API}/api/vendors`);
    if (vendorsRes.ok) {
      const payload = (await vendorsRes.json()) as { vendors?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>;
      vendors = Array.isArray(payload) ? payload : payload.vendors ?? [];
    }
  } catch {
    vendors = [];
  }

  if (vendors.length === 0) {
    vendors = await fetchVendorCandidatesFromProducts();
  }

  if (vendors.length === 0) return [];

  const stores: Array<StoreListItem | null> = await Promise.all(
    vendors.map(async (vendor) => {
      const wallet = String(vendor.wallet ?? vendor.vendor_wallet ?? vendor.owner_wallet ?? "");
      if (!wallet) return null;

      let storeData: Record<string, unknown> | null = null;
      try {
        storeData = await fetchStoresForWallet(wallet);
      } catch {
        storeData = null;
      }

      const vendorType = toVendorType(
        String(storeData?.store_type ?? vendor.vendor_type ?? vendor.store_type ?? "")
      );
      const seed = Array.from(wallet).reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const memberSince = parseYear(
        storeData?.created_at ?? vendor.created_at ?? new Date().toISOString()
      );
      const ratingCount = Number(vendor.rating_count ?? 0) || (30 + (seed % 90));
      const ratingSum = Number(vendor.rating_sum ?? 0) || Math.round((4.2 + (seed % 8) / 10) * ratingCount);
      const ratingAvg = ratingCount > 0 ? ratingSum / ratingCount : 0;
      const storeId = String(storeData?.id ?? vendor.store_id ?? computeStoreIdFromWallet(wallet));
      const storeName = String(storeData?.store_name ?? vendor.shop_name ?? `Supplier ${wallet.slice(0, 6)}`);
      const categories = parseCategories(storeData?.categories ?? vendor.categories);

      return {
        id: storeId,
        storeId,
        slug: String(storeData?.slug ?? vendor.slug ?? storeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")),
        shopName: storeName,
        shopDescription: String(storeData?.description ?? vendor.description ?? "Verified global supplier for escrow-protected B2B trade."),
        vendorType,
        isVerified: Boolean(storeData?.is_verified ?? vendor.is_verified ?? true),
        location: String(vendor.location ?? "Global"),
        memberSince,
        responseTime: `${1 + (seed % 8)} hrs`,
        ratingSum,
        ratingCount,
        ratingAvg,
        totalSales: Number(vendor.total_sales ?? vendor.totalSales ?? 0) || 500000 + seed * 50,
        followerCount: Number(vendor.follower_count ?? 0) || 250 + (seed % 4000),
        onTimeDelivery: 88 + (seed % 12),
        repeatBuyers: 42 + (seed % 42),
        totalOrders: Number(vendor.total_orders ?? 0) || 280 + (seed % 4200),
        categories: categories.length > 0 ? categories : ["Industrial Components", "Machinery"],
        walletAddr: wallet,
        source: "api" as const,
      };
    })
  );

  return stores.filter((store): store is Exclude<typeof store, null> => store !== null);
}

function StoreCard({
  store,
  isFollowed,
  onToggleFollow,
  onEnterStore,
}: {
  store: StoreListItem;
  isFollowed: boolean;
  onToggleFollow: (storeId: string) => void;
  onEnterStore: (store: StoreListItem) => void;
}) {
  const typeStyle = VENDOR_TYPE_COLORS[store.vendorType] || VENDOR_TYPE_COLORS.Wholesaler;

  return (
    <article className="group glass relative flex flex-col overflow-hidden transition-all duration-500 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5">
      {/* Decorative Header */}
      <div className="h-24 w-full bg-gradient-to-br from-secondary/50 via-background to-secondary/30 relative">
        <div className="absolute top-4 right-4">
          <span
            className="badge font-black uppercase tracking-widest text-[9px]"
            style={{
              background: typeStyle.bg,
              color: typeStyle.color,
              border: `1px solid ${typeStyle.border}`,
              padding: "4px 10px",
            }}
          >
            {store.vendorType}
          </span>
        </div>
      </div>

      <div className="px-6 pb-6 -mt-10 relative z-10 flex flex-col flex-1">
        <div className="flex items-end gap-4 mb-5">
          <div className="shrink-0 border-4 border-background rounded-2xl shadow-lg">
            {initialsAvatar(store.shopName, 64)}
          </div>
          <div className="pb-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-black text-foreground tracking-tight truncate">
                {store.shopName}
              </h3>
              {store.isVerified && (
                <ShieldCheck size={16} className="text-green-500 shrink-0" />
              )}
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {store.location} · EST. {store.memberSince}
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-6 min-h-[40px]">
          {store.shopDescription}
        </p>

        {/* Categories */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {store.categories.slice(0, 3).map((category) => (
            <span
              key={category}
              className="px-2.5 py-1 rounded-lg bg-secondary/50 border border-border text-[10px] font-bold text-foreground uppercase tracking-tighter"
            >
              {category}
            </span>
          ))}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-3 rounded-2xl bg-secondary/30 p-3 border border-border/50 mb-6">
          <div className="text-center">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Rating</p>
            <div className="flex items-center justify-center gap-1 text-sm font-black text-foreground">
              <Star size={12} className="text-amber-500 fill-amber-500" />
              {store.ratingAvg.toFixed(1)}
            </div>
          </div>
          <div className="text-center border-x border-border/50">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Delivery</p>
            <div className="text-sm font-black text-foreground">{store.onTimeDelivery}%</div>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Repeat</p>
            <div className="text-sm font-black text-foreground">{store.repeatBuyers}%</div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-auto flex gap-2">
          <button
            type="button"
            className="flex-1 bg-foreground text-background py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:bg-primary hover:shadow-lg active:scale-95"
            onClick={() => onEnterStore(store)}
          >
            Enter Store
          </button>
          <button
            type="button"
            onClick={() => onToggleFollow(store.storeId)}
            className={`px-4 rounded-xl border-2 transition-all active:scale-95 flex items-center justify-center ${isFollowed
                ? "bg-primary/10 border-primary/20 text-primary"
                : "bg-transparent border-foreground text-foreground hover:bg-foreground hover:text-background"
              }`}
          >
            <Heart size={16} fill={isFollowed ? "currentColor" : "none"} />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function StoresPage() {
  const router = useRouter();
  const [stores, setStores] = useState<StoreListItem[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<StoreFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followedStores, setFollowedStores] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FOLLOWED_STORES_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed)) {
        setFollowedStores(parsed);
      }
    } catch {
      setFollowedStores([]);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const apiStores = await fetchStoreListFromApi();
        if (apiStores.length > 0) {
          setStores(apiStores);
        } else {
          setStores(fromMockStores());
        }
      } catch {
        setStores(fromMockStores());
        setError("Unable to load live suppliers. Showing curated suppliers.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const filteredStores = useMemo(() => {
    if (selectedFilter === "all") return stores;
    return stores.filter((store) => vendorTypeToSellerTier(store.vendorType) === selectedFilter);
  }, [selectedFilter, stores]);

  const verifiedCount = stores.filter((store) => store.isVerified).length;

  const handleToggleFollow = (storeId: string) => {
    const next = followedStores.includes(storeId)
      ? followedStores.filter((id) => id !== storeId)
      : [...followedStores, storeId];
    setFollowedStores(next);
    localStorage.setItem(FOLLOWED_STORES_KEY, JSON.stringify(next));
  };

  const handleEnterStore = (store: StoreListItem) => {
    if (store.source === "mock" || store.storeId.startsWith("mock-")) {
      router.push(`/marketplace/vendor/${store.walletAddr}`);
      return;
    }
    router.push(`/stores/${store.storeId}`);
  };

  return (
    <main className="min-h-screen bg-background relative overflow-hidden pb-20" style={{ paddingTop: "80px" }}>
      {/* Background effects constrained with overflow-hidden */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[160px]" />
        <div className="absolute bottom-0 right-1/4 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[160px]" />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header: Title & Subtitle */}
        <section className="glass mb-8 rounded-3xl p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="badge-pill badge-pill-primary">
                <Store size={13} />
                Premium Supplier Portal
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-foreground md:text-5xl">
                Suppliers
              </h1>
              <p className="mt-3 text-sm text-muted-foreground md:text-base">
                Browse verified global suppliers. Enter a store to inspect catalog, trust metrics, and trade terms.
              </p>
              <Link
                href="/dashboard"
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                View all products without store filter
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px] lg:grid-cols-3">
              <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Suppliers</p>
                <p className="mt-1 text-2xl font-black text-foreground">{stores.length}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Verified</p>
                <p className="mt-1 text-2xl font-black text-foreground">{verifiedCount}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Followed</p>
                <p className="mt-1 text-2xl font-black text-foreground">{followedStores.length}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Filter Bar: Full-width row above grid */}
        <div className="mb-8 flex flex-wrap gap-2 justify-start">
          {FILTERS.map((filter) => {
            const active = selectedFilter === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setSelectedFilter(filter.value)}
                className="badge"
                style={{
                  border: `1px solid ${active ? "var(--border-accent)" : "var(--border)"}`,
                  background: active ? "var(--primary-light)" : "var(--bg-surface)",
                  color: active ? "var(--primary)" : "var(--text-secondary)",
                  padding: "0.4rem 1rem",
                  cursor: "pointer",
                  minHeight: "36px",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  transition: "all 150ms ease",
                }}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="glass mb-6" style={{ padding: "1rem", color: "var(--amber)" }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="glass" style={{ padding: "1.25rem", height: "420px" }}>
                <div className="skeleton" style={{ height: "100%" }} />
              </div>
            ))}
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="glass p-12 text-center" style={{ color: "var(--text-muted)" }}>
            <div style={{ fontSize: "0.875rem", marginBottom: "1rem" }}>No suppliers found for this category.</div>
            <button
              type="button"
              onClick={() => setSelectedFilter("all")}
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              style={{ textDecoration: "underline" }}
            >
              Clear Filter
            </button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" style={{ gridAutoFlow: filteredStores.length < 3 ? "dense" : "row", justifyItems: filteredStores.length < 3 ? "start" : "auto" }}>
            {filteredStores.map((store) => (
              <StoreCard
                key={store.id}
                store={store}
                isFollowed={followedStores.includes(store.storeId)}
                onToggleFollow={handleToggleFollow}
                onEnterStore={handleEnterStore}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
