'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, Heart } from "lucide-react";
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
  const typeStyle = VENDOR_TYPE_COLORS[store.vendorType] ?? {
    bg: "rgba(255,255,255,0.05)",
    color: "var(--text-secondary)",
    border: "var(--border)",
  };

  return (
    <article
      className="glass relative"
      style={{
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.625rem",
        transition: "box-shadow var(--transition), border-color var(--transition), transform var(--transition)",
      }}
      onMouseEnter={(event) => {
        const el = event.currentTarget as HTMLDivElement;
        el.style.transform = "translateY(-2px)";
        el.style.boxShadow = "var(--shadow-card)";
        el.style.borderColor = "var(--border-accent)";
      }}
      onMouseLeave={(event) => {
        const el = event.currentTarget as HTMLDivElement;
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "";
        el.style.borderColor = "";
      }}
    >
      {/* Absolute Badge (top-right) */}
      <div style={{ position: "absolute", top: "0.75rem", right: "0.75rem" }}>
        <span
          className="badge"
          style={{
            background: typeStyle.bg,
            color: typeStyle.color,
            border: `1px solid ${typeStyle.border}`,
            fontSize: "0.625rem",
            padding: "0.25rem 0.5rem",
            display: "inline-block",
          }}
        >
          {store.vendorType}
        </span>
      </div>

      {/* Header row: Avatar + Name */}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
        {initialsAvatar(store.shopName, 36)}
        <div style={{ flex: 1, minWidth: 0, paddingTop: "0.125rem" }}>
          <strong style={{ fontSize: "0.9375rem", fontWeight: 600, color: "white", lineHeight: 1.2, display: "block" }}>
            {store.shopName}
          </strong>
        </div>
      </div>

      {/* Verified badge on its own line */}
      {store.isVerified && (
        <div>
          <span className="badge badge-green" style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", fontSize: "0.75rem" }}>
            <ShieldCheck size={11} />
            Verified
          </span>
        </div>
      )}

      {/* Sub-row: Location, Since, Rating */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <span style={{ color: "#A3A3A3", fontSize: "0.6875rem" }}>
          {store.location} · Since {store.memberSince}
        </span>
        {starRow(store.ratingSum, store.ratingCount)}
      </div>

      {/* Tags row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
        {store.categories.slice(0, 3).map((category) => (
          <span
            key={category}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0.25rem 0.5rem",
              borderRadius: "var(--radius-pill)",
              fontSize: "0.6875rem",
              background: "var(--cyan-dim)",
              color: "#4B5563",
              border: "1px solid var(--border)",
            }}
          >
            {category}
          </span>
        ))}
      </div>

      {/* Stats row: 3 columns with clear layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "0.5rem",
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
          paddingTop: "0.5rem",
          paddingBottom: "0.5rem",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.9375rem", fontWeight: 600, color: "white" }}>
            {store.totalOrders.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.625rem", textTransform: "uppercase", color: "#6B7280", fontWeight: 600, letterSpacing: "0.05em" }}>
            Orders
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.9375rem", fontWeight: 600, color: "white" }}>
            {store.onTimeDelivery}%
          </div>
          <div style={{ fontSize: "0.625rem", textTransform: "uppercase", color: "#6B7280", fontWeight: 600, letterSpacing: "0.05em" }}>
            On-time
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.9375rem", fontWeight: 600, color: "white" }}>
            {store.repeatBuyers}%
          </div>
          <div style={{ fontSize: "0.625rem", textTransform: "uppercase", color: "#6B7280", fontWeight: 600, letterSpacing: "0.05em" }}>
            Repeat
          </div>
        </div>
      </div>

      {/* CTA row: Side-by-side buttons */}
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
        <button
          type="button"
          className="btn-primary"
          onClick={() => onEnterStore(store)}
          style={{ flex: 1, fontSize: "0.875rem", padding: "0.375rem 0.75rem" }}
        >
          Enter Store →
        </button>
        <button
          type="button"
          onClick={() => onToggleFollow(store.storeId)}
          style={{
            padding: "0.375rem 0.75rem",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.35rem",
            fontSize: "0.875rem",
            border: "1px solid rgba(255,255,255,0.25)",
            background: "transparent",
            color: "#D1D5DB",
            borderRadius: "0.5rem",
            cursor: "pointer",
            transition: "all 150ms ease",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.color = "white";
            el.style.background = "rgba(255,255,255,0.1)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.color = isFollowed ? "white" : "#D1D5DB";
            el.style.background = isFollowed ? "rgba(255,255,255,0.1)" : "transparent";
          }}
        >
          <Heart size={14} fill={isFollowed ? "currentColor" : "none"} />
          {isFollowed ? "Following" : "Follow"}
        </button>
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
        <div className="mb-8 space-y-2">
          <h1 className="text-5xl font-black tracking-tight text-foreground" style={{ fontSize: "3rem", fontWeight: 900 }}>
            Suppliers
          </h1>
          <p className="text-base font-normal text-muted-foreground" style={{ fontSize: "1rem", fontWeight: 400 }}>
            Browse verified global suppliers. Enter a store to view catalog and trade terms.
          </p>
          <Link
            href="/dashboard"
            className="text-xs inline-block text-muted-foreground hover:text-cyan-400 transition-colors no-underline"
            style={{ fontSize: "0.8rem", marginTop: "0.75rem" }}
          >
            View all products without store filter →
          </Link>
        </div>

        {/* Filter Bar: Full-width row above grid */}
        <div className="mb-8 flex flex-wrap gap-2 justify-start">
          {FILTERS.map((filter) => {
            const active = selectedFilter === filter.value;
            const filterColors: Record<StoreFilter, { bg: string; color: string; borderColor: string }> = {
              all: { bg: active ? "#0066FF" : "transparent", color: active ? "white" : "var(--text-secondary)", borderColor: active ? "#0066FF" : "var(--border)" },
              manufacturer: { bg: active ? "#F97316" : "transparent", color: active ? "white" : "var(--text-secondary)", borderColor: active ? "#F97316" : "var(--border)" },
              distributor: { bg: active ? "#06B6D4" : "transparent", color: active ? "white" : "var(--text-secondary)", borderColor: active ? "#06B6D4" : "var(--border)" },
              wholesaler: { bg: active ? "#A855F7" : "transparent", color: active ? "white" : "var(--text-secondary)", borderColor: active ? "#A855F7" : "var(--border)" },
            };
            const filterStyle = filterColors[filter.value];
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setSelectedFilter(filter.value)}
                className="badge"
                style={{
                  border: `1px solid ${filterStyle.borderColor}`,
                  background: filterStyle.bg,
                  color: filterStyle.color,
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
