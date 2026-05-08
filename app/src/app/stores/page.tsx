'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowRight, Store } from "lucide-react";
import { MOCK_STORES, type PublicStore, vendorTypeToSellerTier } from "@/lib/data/mockStores";
import type { StoreCardItem } from "@/components/stores/StoreCardGrid";

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

const StoresStatsOverview = dynamic(
  () => import("@/components/stores/StoresStatsOverview").then((m) => m.StoresStatsOverview),
  { ssr: false },
);

const StoreCardGrid = dynamic(
  () => import("@/components/stores/StoreCardGrid").then((m) => m.StoreCardGrid),
  { ssr: false },
);

function toVendorType(value?: string): PublicStore["vendorType"] {
  const v = (value ?? "").toLowerCase();
  if (v === "manufacturer") return "Manufacturer";
  if (v === "distributor") return "Distributor";
  return "Wholesaler";
}

function computeStoreIdFromWallet(wallet: string) {
  return `vendor-${wallet}`;
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

  const handleEnterStore = (store: any) => {
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

            <StoresStatsOverview total={stores.length} verified={verifiedCount} followed={followedStores.length} />
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
          <StoreCardGrid
            stores={filteredStores as StoreCardItem[]}
            followedStoreIds={followedStores}
            onToggleFollow={handleToggleFollow}
            onEnterStore={handleEnterStore}
          />
        )}
      </div>
    </main>
  );
}
