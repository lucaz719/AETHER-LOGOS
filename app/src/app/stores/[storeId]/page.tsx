'use client';

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProductCard } from "@/components/dashboard/ProductCard";
import { Clock3, Heart, Repeat2, ShieldCheck, Star, Store } from "lucide-react";
import {
  MOCK_STORES,
  mapApiProductToDashboardProduct,
  type DashboardProduct,
  type PublicStore,
  type StoreVendorType,
} from "@/lib/data/mockStores";

const API = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8080";
const FOLLOWED_STORES_KEY = "aether_followed_stores";

type StoreTab = "Store" | "Products" | "About";

type StoreApi = {
  id?: number;
  owner_wallet?: string;
  slug?: string;
  store_name?: string;
  description?: string;
  store_type?: string;
  categories?: string;
  is_verified?: boolean;
  created_at?: string;
};

type ApiProduct = {
  id?: number;
  vendor_wallet?: string;
  title?: string;
  category?: string;
  price_usdc?: number;
  moq?: number;
  lead_time_days?: number;
  rating?: number;
  seller_tier?: string;
};

function parseCategories(raw?: string) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toVendorType(value?: string): StoreVendorType {
  const v = (value ?? "").toLowerCase();
  if (v === "manufacturer") return "Manufacturer";
  if (v === "distributor") return "Distributor";
  return "Wholesaler";
}

function buildStoreFromApi(storeId: string, payload: StoreApi): Omit<PublicStore, "products"> {
  const wallet = payload.owner_wallet ?? `store-${storeId}`;
  const categories = parseCategories(payload.categories);
  const seed = Array.from(wallet).reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const ratingCount = 40 + (seed % 60);
  const ratingSum = Math.round((4.2 + (seed % 7) / 10) * ratingCount);
  return {
    id: String(payload.id ?? storeId),
    storeId: String(payload.id ?? storeId),
    slug: payload.slug ?? `store-${storeId}`,
    shopName: payload.store_name ?? "Supplier Store",
    shopDescription: payload.description ?? "Global supplier catalog with escrow-protected trade settlement.",
    vendorType: toVendorType(payload.store_type),
    isVerified: Boolean(payload.is_verified ?? true),
    location: "Global",
    memberSince: payload.created_at?.slice(0, 4) ?? "2023",
    responseTime: `${1 + (seed % 8)} hrs`,
    ratingSum,
    ratingCount,
    ratingAvg: ratingCount > 0 ? ratingSum / ratingCount : 0,
    totalSales: 500000 + seed * 50,
    followerCount: 300 + (seed % 3000),
    onTimeDelivery: 88 + (seed % 12),
    repeatBuyers: 45 + (seed % 40),
    totalOrders: 200 + (seed % 2600),
    categories: categories.length > 0 ? categories : ["Industrial Components", "Machinery"],
    walletAddr: wallet,
  };
}

function initialsAvatar(name: string, size = 64) {
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
        borderRadius: "var(--radius-md)",
        background: `hsl(${hue},50%,18%)`,
        border: `1px solid hsl(${hue},50%,30%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: size * 0.32,
        color: `hsl(${hue},60%,70%)`,
        flexShrink: 0,
      }}
    >
      {initials || "?"}
    </div>
  );
}

export default function StoreDetailPage() {
  const router = useRouter();
  const { storeId } = useParams<{ storeId: string }>();

  const [store, setStore] = useState<PublicStore | null>(null);
  const [products, setProducts] = useState<DashboardProduct[]>([]);
  const [activeTab, setActiveTab] = useState<StoreTab>("Store");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followedStores, setFollowedStores] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FOLLOWED_STORES_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed)) setFollowedStores(parsed);
    } catch {
      setFollowedStores([]);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!storeId) return;
      setLoading(true);
      setError(null);

      try {
        if (storeId.startsWith("mock-")) {
          const mockStore = MOCK_STORES.find((candidate) => candidate.storeId === storeId);
          if (!mockStore) {
            setError("Store not found.");
            setStore(null);
            setProducts([]);
            return;
          }
          setStore(mockStore);
          setProducts(mockStore.products);
          return;
        }

        if (storeId.startsWith("vendor-")) {
          const wallet = storeId.replace("vendor-", "");
          const [vendorRes, productsRes] = await Promise.all([
            fetch(`${API}/api/vendor/${wallet}`),
            fetch(`${API}/api/products?vendor=${wallet}`),
          ]);

          if (!vendorRes.ok) {
            setError("Supplier not found.");
            setStore(null);
            setProducts([]);
            return;
          }

          const vendorPayload = await vendorRes.json();
          const mappedStore = buildStoreFromApi(storeId, {
            owner_wallet: wallet,
            store_name: vendorPayload.shop_name,
            description: vendorPayload.description,
            store_type: vendorPayload.vendor_type,
            categories: vendorPayload.categories,
            is_verified: true,
            created_at: vendorPayload.created_at,
          });

          let mappedProducts: DashboardProduct[] = [];
          if (productsRes.ok) {
            const productsPayload = await productsRes.json();
            mappedProducts = (productsPayload.products ?? []).map((item: any) =>
              mapApiProductToDashboardProduct(item, mappedStore.shopName, mappedStore.walletAddr, mappedStore.vendorType)
            );
          }

          setStore({ ...mappedStore, products: mappedProducts });
          setProducts(mappedProducts);
          return;
        }

        const [storeRes, productsRes] = await Promise.all([
          fetch(`${API}/api/stores/${storeId}`),
          fetch(`${API}/api/stores/${storeId}/products`),
        ]);

        if (!storeRes.ok) {
          setError("Store not found.");
          setStore(null);
          setProducts([]);
          return;
        }

        const storePayload = (await storeRes.json()) as StoreApi;
        const mappedStore = buildStoreFromApi(storeId, storePayload);

        let mappedProducts: DashboardProduct[] = [];
        if (productsRes.ok) {
          const productsPayload = (await productsRes.json()) as { products?: ApiProduct[] };
          mappedProducts = (productsPayload.products ?? []).map((item) =>
            mapApiProductToDashboardProduct(item, mappedStore.shopName, mappedStore.walletAddr, mappedStore.vendorType)
          );
        }

        const categories =
          mappedStore.categories.length > 0
            ? mappedStore.categories
            : Array.from(new Set(mappedProducts.map((product) => product.category))).filter(Boolean);

        setStore({ ...mappedStore, categories, products: mappedProducts });
        setProducts(mappedProducts);
      } catch {
        setError("Unable to load store right now.");
        setStore(null);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [storeId]);

  const isFollowed = useMemo(() => {
    if (!store) return false;
    return followedStores.includes(store.storeId);
  }, [followedStores, store]);

  const toggleFollow = () => {
    if (!store) return;
    const next = followedStores.includes(store.storeId)
      ? followedStores.filter((id) => id !== store.storeId)
      : [...followedStores, store.storeId];
    setFollowedStores(next);
    localStorage.setItem(FOLLOWED_STORES_KEY, JSON.stringify(next));
  };

  const handleBuy = (payload: {
    productId: string;
    title: string;
    sellerWallet: string;
    usdcMint: string;
    tier: string;
    moq: number;
    leadTimeDays: number;
    priceUsdc?: number;
  }) => {
    const params = new URLSearchParams();
    Object.entries(payload).forEach(([k, v]) => {
      if (v !== undefined) params.set(k, String(v));
    });
    router.push(`/trades?${params.toString()}`);
  };

  const filteredProducts = useMemo(() => {
    const searchNormalized = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = categoryFilter === "All" || product.category === categoryFilter;
      const matchesSearch =
        searchNormalized.length === 0 ||
        product.title.toLowerCase().includes(searchNormalized) ||
        product.category.toLowerCase().includes(searchNormalized);
      return matchesCategory && matchesSearch;
    });
  }, [products, search, categoryFilter]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background relative overflow-hidden pt-24 pb-20">
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[160px] pointer-events-none" />
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 space-y-4">
          <div className="skeleton" style={{ height: "48px", width: "220px" }} />
          <div className="glass p-6">
            <div className="skeleton" style={{ height: "220px" }} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: "280px", borderRadius: "var(--radius-lg)" }} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (!store) {
    return (
      <main className="min-h-screen bg-background relative overflow-hidden pt-24 pb-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <button type="button" onClick={() => router.push("/stores")} className="btn-ghost" style={{ marginBottom: "1rem" }}>
            ← Back to Suppliers
          </button>
          <div className="glass p-12 text-center">
            <p style={{ color: "var(--red)", fontWeight: 700, marginBottom: "0.4rem" }}>{error ?? "Store unavailable."}</p>
            <p style={{ color: "var(--text-muted)" }}>Try another supplier or retry in a moment.</p>
          </div>
        </div>
      </main>
    );
  }

  const averageRating = store.ratingCount > 0 ? store.ratingSum / store.ratingCount : 0;

  return (
    <main className="min-h-screen bg-background relative overflow-hidden pt-24 pb-20">
      <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <button type="button" onClick={() => router.back()} className="btn-ghost" style={{ marginBottom: "1rem" }}>
          ← Back to Suppliers
        </button>

        <section className="glass mb-6 overflow-hidden rounded-3xl">
          <div className="relative p-6 md:p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-violet-500/10" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-5 md:flex-row md:items-center">
                {initialsAvatar(store.shopName, 72)}
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="badge-pill badge-pill-primary">
                      <Store size={13} />
                      Institutional Header
                    </div>
                    {store.isVerified && (
                      <span className="badge badge-green inline-flex items-center gap-1">
                        <ShieldCheck size={11} />
                        Verified on Solana Devnet
                      </span>
                    )}
                    <span className="badge badge-cyan">{store.vendorType}</span>
                  </div>
                  <h1 className="mt-4 text-3xl font-black tracking-tight text-foreground md:text-4xl">
                    {store.shopName}
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                    {store.shopDescription}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 lg:justify-end">
                <button
                  type="button"
                  onClick={toggleFollow}
                  className={`btn-follow ${isFollowed ? "btn-follow-active" : ""}`}
                >
                  <Heart size={14} fill={isFollowed ? "currentColor" : "none"} />
                  {isFollowed ? "Following" : "Follow"}
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 border-t border-border bg-background/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <Star size={11} className="text-amber-500" />
                Seller rating
              </div>
              <p className="mt-1 text-2xl font-black text-foreground">{averageRating.toFixed(1)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <Clock3 size={11} className="text-cyan-500" />
                On-time delivery
              </div>
              <p className="mt-1 text-2xl font-black text-foreground">{store.onTimeDelivery}%</p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <Repeat2 size={11} className="text-emerald-500" />
                Repeat buyers
              </div>
              <p className="mt-1 text-2xl font-black text-foreground">{store.repeatBuyers}%</p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <ShieldCheck size={11} className="text-primary" />
                Total orders
              </div>
              <p className="mt-1 text-2xl font-black text-foreground">{store.totalOrders.toLocaleString()}</p>
            </div>
          </div>
        </section>

        <div className="flex gap-1 mb-8 border-b border-border">
          {(["Store", "Products", "About"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-bold transition-all ${activeTab === tab
                  ? "text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
                }`}
              style={{ minHeight: "40px" }}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Store" && (
          <div className="space-y-8">
            <div className="flex gap-2 flex-wrap">
              {store.categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => {
                    setCategoryFilter(category);
                    setActiveTab("Products");
                  }}
                  style={{
                    padding: "0.3rem 0.75rem",
                    borderRadius: "var(--radius-pill)",
                    border: "1px solid var(--border)",
                    background: "var(--cyan-dim)",
                    color: "var(--cyan)",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    transition: "all var(--transition)",
                  }}
                >
                  {category}
                </button>
              ))}
            </div>

            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "1rem" }}>
                Featured Products
              </h2>
              {products.length === 0 ? (
                <div className="glass p-12 text-center" style={{ color: "var(--text-muted)" }}>
                  No products published yet.
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {products.slice(0, 4).map((product) => (
                    <ProductCard key={product.productId} {...product} onBuy={handleBuy} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "Products" && (
          <div>
            <div className="flex gap-3 mb-6 flex-wrap">
              <label className="sr-only" htmlFor="store-product-search">Search products in this store</label>
              <input
                id="store-product-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="input"
                placeholder="Search products in this store..."
                style={{ flex: 1, minWidth: 200 }}
              />
              <div className="flex gap-2 flex-wrap">
                {["All", ...store.categories].map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setCategoryFilter(category)}
                    style={{
                      padding: "0.3rem 0.75rem",
                      borderRadius: "var(--radius-pill)",
                      border: categoryFilter === category ? "1px solid var(--cyan)" : "1px solid var(--border)",
                      background: categoryFilter === category ? "var(--cyan-dim)" : "transparent",
                      color: categoryFilter === category ? "var(--cyan)" : "var(--text-secondary)",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      transition: "all var(--transition)",
                      minHeight: "40px",
                    }}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="glass p-12 text-center" style={{ color: "var(--text-muted)" }}>
                No products match your search.
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.productId} {...product} onBuy={handleBuy} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "About" && (
          <div className="glass rounded-xl p-6 max-w-2xl space-y-6">
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>{store.shopDescription}</p>
            <div className="grid grid-cols-2 gap-4" style={{ borderTop: "1px solid var(--border)", paddingTop: "1.5rem" }}>
              <div><strong style={{ color: "var(--text-primary)" }}>Founded</strong><p style={{ color: "var(--text-secondary)" }}>{store.memberSince}</p></div>
              <div><strong style={{ color: "var(--text-primary)" }}>Location</strong><p style={{ color: "var(--text-secondary)" }}>{store.location}</p></div>
              <div><strong style={{ color: "var(--text-primary)" }}>Vendor Type</strong><p style={{ color: "var(--text-secondary)" }}>{store.vendorType}</p></div>
              <div><strong style={{ color: "var(--text-primary)" }}>Response Time</strong><p style={{ color: "var(--text-secondary)" }}>{store.responseTime}</p></div>
              <div><strong style={{ color: "var(--text-primary)" }}>Categories</strong><p style={{ color: "var(--text-secondary)" }}>{store.categories.join(", ")}</p></div>
              <div><strong style={{ color: "var(--text-primary)" }}>Trade Terms</strong><p style={{ color: "var(--text-secondary)" }}>Escrow-protected via USDC</p></div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
