"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Zap } from "lucide-react";
import { DashboardModeToggle } from "@/components/dashboard/DashboardModeToggle";
import { MarketplaceFilters } from "@/components/dashboard/MarketplaceFilters";
import { ProductCard } from "@/components/dashboard/ProductCard";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const DashboardStatsOverview = dynamic(
  () => import("@/components/dashboard/DashboardStatsOverview").then((m) => m.DashboardStatsOverview),
  { ssr: false },
);
const HedgeMarketGrid = dynamic(
  () => import("@/components/dashboard/HedgeMarketGrid").then((m) => m.HedgeMarketGrid),
  { ssr: false },
);

const API = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8080";
const DEFAULT_USDC_MINT = "EPjFWaLb3hyccqaAjRmjRAmsPd83Un1Zc1zLH3BckKQi";

type SellerTier = "distributor" | "wholesaler" | "manufacturer";
type DashboardProduct = {
  productId: string;
  title: string;
  category: string;
  vendor: string;
  sellerWallet: string;
  sellerTier: SellerTier;
  rating: number;
  priceUsdc: number;
  moq: number;
  leadTimeDays: number;
  usdcMint: string;
};

type ApiProduct = {
  id: number;
  vendor_wallet: string;
  title: string;
  short_description?: string;
  price_usdc: number;
  category: string;
  moq?: number;
  lead_time_days?: number;
  rating?: number;
  seller_tier?: string;
};

function normalizeTier(value?: string): SellerTier {
  if (value === "manufacturer" || value === "distributor" || value === "wholesaler") {
    return value;
  }
  return "wholesaler";
}

const hedgeMarkets = [
  {
    marketType: "DHL Customs Event",
    title: "Will the shipment be held at Customs for > 48 hours?",
    yesProbability: 64.2,
    yesLiquidity: 860000,
    noLiquidity: 520000,
    expiry: "2026-05-05 18:00 UTC",
    verificationSignal: "DHL event code: customs-clearance + hold duration",
    riskLevel: "high" as const,
  },
  {
    marketType: "DHL Delivery SLA",
    title: "Will the delivery be completed before 2026-05-07 12:00 UTC?",
    yesProbability: 58.4,
    yesLiquidity: 420000,
    noLiquidity: 310000,
    expiry: "2026-05-07 12:00 UTC",
    verificationSignal: "DHL delivered timestamp vs target deadline",
    riskLevel: "medium" as const,
  },
  {
    marketType: "DHL Transit Exception",
    title: "Will the shipment encounter a 'Transit Exception'?",
    yesProbability: 33.6,
    yesLiquidity: 510000,
    noLiquidity: 1020000,
    expiry: "2026-05-06 20:00 UTC",
    verificationSignal: "DHL status stream includes TRANSIT_EXCEPTION",
    riskLevel: "low" as const,
  },
  {
    marketType: "Weather Delay",
    title: "Will weather delays push delivery by more than 24 hours?",
    yesProbability: 22.1,
    yesLiquidity: 280000,
    noLiquidity: 975000,
    expiry: "2026-05-08 06:00 UTC",
    verificationSignal: "Weather service data + carrier delay logs",
    riskLevel: "low" as const,
  },
];

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<"marketplace" | "hedge">("marketplace");

  useEffect(() => {
    const m = searchParams.get("mode");
    if (m === "hedge" || m === "marketplace") {
      setMode(m);
    }
  }, [searchParams]);

  const handleModeChange = (newMode: "marketplace" | "hedge") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", newMode);
    router.push(`/dashboard?${params.toString()}`);
  };
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [minRating, setMinRating] = useState<number>(0);
  const [products, setProducts] = useState<DashboardProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      setProductsLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedCategory !== "all") params.set("category", selectedCategory);
        if (selectedTier !== "all") params.set("tier", selectedTier);
        if (minRating > 0) params.set("minRating", minRating.toString());

        const url = `${API}/api/products${params.toString() ? `?${params.toString()}` : ""}`;
        const productsRes = await fetch(url);
        if (!productsRes.ok) {
          setProducts([]);
          return;
        }
        const productsPayload = await productsRes.json() as { products?: ApiProduct[] };
        const rawProducts = productsPayload.products ?? [];
        if (rawProducts.length === 0) {
          setProducts([]);
          return;
        }

        const vendorWallets = Array.from(new Set(rawProducts.map((item) => item.vendor_wallet)));
        const vendorEntries = await Promise.all(
          vendorWallets.map(async (wallet) => {
            const res = await fetch(`${API}/api/vendor/${wallet}`);
            if (res.ok) {
              const vendor = await res.json() as { shop_name?: string; vendor_type?: string };
              return [wallet, vendor] as const;
            }
            const storesRes = await fetch(`${API}/api/vendors/${wallet}/stores`);
            if (!storesRes.ok) return [wallet, null] as const;
            const storesPayload = await storesRes.json() as {
              stores?: Array<{ store_name?: string; store_type?: string }>;
            };
            const firstStore = storesPayload.stores?.[0];
            if (!firstStore) return [wallet, null] as const;
            return [
              wallet,
              { shop_name: firstStore.store_name, vendor_type: firstStore.store_type },
            ] as const;
          }),
        );
        const vendorByWallet = new Map(vendorEntries);

        const mapped = rawProducts.map((item): DashboardProduct => {
          const vendor = vendorByWallet.get(item.vendor_wallet);
          const tier = normalizeTier(item.seller_tier ?? vendor?.vendor_type);
          return {
            productId: String(item.id),
            title: item.title,
            category: item.category || "General",
            vendor: vendor?.shop_name || "Unknown Vendor",
            sellerWallet: item.vendor_wallet,
            sellerTier: tier,
            rating: item.rating && item.rating > 0 ? item.rating : 4.7,
            priceUsdc: item.price_usdc,
            moq: item.moq && item.moq > 0 ? item.moq : (tier === "manufacturer" ? 10 : tier === "wholesaler" ? 25 : 5),
            leadTimeDays: item.lead_time_days && item.lead_time_days > 0 ? item.lead_time_days : (tier === "manufacturer" ? 14 : tier === "wholesaler" ? 9 : 5),
            usdcMint: DEFAULT_USDC_MINT,
          };
        });
        setProducts(mapped);
      } catch {
        setProducts([]);
      } finally {
        setProductsLoading(false);
      }
    };

    void loadProducts();
  }, [selectedTier, selectedCategory, minRating]);

  const filteredProducts = products;

  const handleProductBuy = (payload: {
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
    params.set("productId", payload.productId);
    params.set("title", payload.title);
    params.set("sellerWallet", payload.sellerWallet);
    params.set("usdcMint", payload.usdcMint);
    params.set("tier", payload.tier);
    params.set("moq", payload.moq.toString());
    params.set("leadTimeDays", payload.leadTimeDays.toString());
    if (payload.priceUsdc) {
      params.set("priceUsdc", payload.priceUsdc.toString());
    }
    router.push(`/trades?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-background relative overflow-hidden pt-28 pb-20">
      {/* Premium Atmospheric Backgrounds */}
      <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[160px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-0 right-1/4 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[160px] pointer-events-none -z-10"></div>

      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Top Header Section */}
        <header className="mb-16 flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-b border-border/50 pb-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
              <Zap size={12} />
              AETHER Protocol v2.4
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-foreground leading-[0.9]">
              {mode === "marketplace" ? "Procurement" : "Risk Desk"}
            </h1>
            <p className="text-base md:text-lg font-bold text-muted-foreground max-w-2xl">
              {mode === "marketplace"
                ? "Unified B2B procurement terminal with integrated zkTLS logistics verification and automated escrow settlement."
                : "Predictive logistics hedge terminal. Analyze DHL event streams and secure your supply chain against latency."}
            </p>
          </div>

          <div className="shrink-0">
            <DashboardModeToggle mode={mode} onChange={handleModeChange} />
          </div>
        </header>

        <section className="relative min-h-[600px]">
          {/* Marketplace Grid */}
          <div
            className={`transition-all duration-500 ease-in-out ${mode === "marketplace" ? "translate-x-0 opacity-100" : "absolute inset-0 -translate-x-8 opacity-0 pointer-events-none"}`}
            aria-hidden={mode !== "marketplace"}
          >
            <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
              <aside className="sticky top-28 h-fit">
                <MarketplaceFilters
                  categories={["Industrial Components", "IoT Hardware", "Cold Chain", "Security Systems"]}
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                  selectedTier={selectedTier}
                  onTierChange={setSelectedTier}
                  minRating={minRating}
                  onRatingChange={setMinRating}
                />
                <DashboardStatsOverview />
              </aside>

              <div className="space-y-8">
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {productsLoading ? (
                    [...Array(6)].map((_, i) => (
                      <div key={i} className="glass h-[420px] animate-pulse" />
                    ))
                  ) : filteredProducts.length === 0 ? (
                    <div className="col-span-full py-20 text-center glass rounded-3xl">
                      <p className="text-muted-foreground font-bold">No assets found in the selected classification.</p>
                    </div>
                  ) : (
                    filteredProducts.map((product) => (
                      <ProductCard
                        key={product.productId}
                        {...product}
                        onBuy={handleProductBuy}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div
            className={`transition-all duration-300 ease-in-out ${mode === "hedge" ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
            aria-hidden={mode !== "hedge"}
          >
            <HedgeMarketGrid markets={hedgeMarkets} />
          </div>
        </section>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-muted-foreground">Initializing AETHER Dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
