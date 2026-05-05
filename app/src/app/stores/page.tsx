'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
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

const VENDOR_TYPE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  Manufacturer: { bg: "rgba(180,83,9,0.12)", color: "#fb923c", border: "rgba(180,83,9,0.3)" },
  Wholesaler: { bg: "rgba(124,58,237,0.12)", color: "#a78bfa", border: "rgba(124,58,237,0.3)" },
  Distributor: { bg: "rgba(8,145,178,0.12)", color: "#22d3ee", border: "rgba(8,145,178,0.3)" },
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
    <span style={{ color: "var(--amber)", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.2rem" }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} style={{ opacity: s <= filled ? 1 : 0.25 }}>★</span>
      ))}
      <small style={{ color: "var(--text-muted)", marginLeft: "0.2rem", fontSize: "0.72rem" }}>
        {ratingCount > 0 ? avg.toFixed(1) : "—"} ({ratingCount})
      </small>
    </span>
  );
}

function initialsAvatar(name: string, size = 44) {
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
      className="glass"
      style={{
        padding: "1rem",
        display: "grid",
        gap: "0.75rem",
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
      <div style={{ display: "flex", gap: "0.65rem", alignItems: "flex-start" }}>
        {initialsAvatar(store.shopName, 44)}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.4rem", flexWrap: "wrap" }}>
            <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)", lineHeight: 1.2 }}>
              {store.shopName}
            </strong>
            <div style={{ display: "flex", gap: "0.35rem", alignItems: "center", flexWrap: "wrap" }}>
              {store.isVerified && (
                <span className="badge badge-green" style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
                  <ShieldCheck size={12} />
                  Verified
                </span>
              )}
              <span className="badge" style={{ background: typeStyle.bg, color: typeStyle.color, border: `1px solid ${typeStyle.border}` }}>
                {store.vendorType}
              </span>
            </div>
          </div>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            {store.location} · Since {store.memberSince}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        {starRow(store.ratingSum, store.ratingCount)}
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
          {store.responseTime} · {store.followerCount.toLocaleString()} followers
        </span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
        {store.categories.slice(0, 3).map((category) => (
          <span
            key={category}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0.15rem 0.55rem",
              borderRadius: "var(--radius-pill)",
              fontSize: "0.72rem",
              background: "var(--cyan-dim)",
              color: "var(--cyan)",
              border: "1px solid var(--border)",
            }}
          >
            {category}
          </span>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr auto 1fr",
          alignItems: "center",
          gap: "0.35rem",
          color: "var(--text-muted)",
          fontSize: "0.73rem",
          borderTop: "1px solid var(--border)",
          paddingTop: "0.65rem",
        }}
      >
        <span>{store.totalOrders.toLocaleString()} Orders</span>
        <span style={{ opacity: 0.5 }}>|</span>
        <span>{store.onTimeDelivery}% On-time</span>
        <span style={{ opacity: 0.5 }}>|</span>
        <span>{store.repeatBuyers}% Repeat</span>
      </div>

      <div style={{ display: "grid", gap: "0.55rem", marginTop: "0.2rem" }}>
        <button type="button" className="btn-primary" onClick={() => onEnterStore(store)}>
          Enter Store →
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => onToggleFollow(store.storeId)}
          style={{ borderColor: isFollowed ? "var(--border-accent)" : undefined, color: isFollowed ? "var(--text-primary)" : undefined }}
        >
          {isFollowed ? "✓ Following" : "+ Follow"}
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
    <main className="min-h-screen bg-background relative overflow-hidden pt-24 pb-20">
      <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-2">
            <h1 className="text-6xl font-black tracking-tighter text-foreground">Suppliers</h1>
            <p className="text-lg font-bold text-muted-foreground">
              Browse verified global suppliers. Enter a store to view catalog and trade terms.
            </p>
            <Link
              href="/dashboard"
              className="text-xs mt-3 inline-block text-muted-foreground hover:text-cyan-400 transition-colors no-underline"
              style={{ fontSize: "0.8rem" }}
            >
              View all products without store filter →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((filter) => {
              const active = selectedFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setSelectedFilter(filter.value)}
                  className="badge"
                  style={{
                    border: active ? "1px solid var(--border-accent)" : "1px solid var(--border)",
                    background: active ? "var(--cyan-dim)" : "transparent",
                    color: active ? "var(--cyan)" : "var(--text-secondary)",
                    padding: "0.32rem 0.8rem",
                    cursor: "pointer",
                    minHeight: "40px",
                  }}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </header>

        {error && (
          <div className="glass" style={{ padding: "0.9rem 1rem", marginBottom: "1rem", color: "var(--amber)" }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="glass" style={{ padding: "1rem" }}>
                <div className="skeleton" style={{ height: "220px" }} />
              </div>
            ))}
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="glass p-12 text-center" style={{ color: "var(--text-muted)" }}>
            No suppliers found for this filter.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
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
