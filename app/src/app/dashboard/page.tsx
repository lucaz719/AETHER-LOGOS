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
    id: 'dhl-customs',
    marketPubkey: 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS',
    category: 'DHL CUSTOMS EVENT',
    question: 'WILL THE SHIPMENT BE HELD AT CUSTOMS FOR > 48 HOURS?',
    risk: 'HIGH' as const,
    liquidity: 1_380_000,
    yesLiquidity: 880_000,
    noLiquidity: 500_000,
    yesPercent: 64.2,
    resolveDate: '2026-06-20T12:00:00Z',
  },
  {
    id: 'dhl-delivery',
    marketPubkey: 'HELPmBPeGPy8bkRS2bFdZ3fvqNFrgwHdFCQp7TvEDN8c',
    category: 'DHL DELIVERY SLA',
    question: 'WILL THE DELIVERY BE COMPLETED BEFORE 2026-06-07 12:00 UTC?',
    risk: 'MEDIUM' as const,
    liquidity: 730_000,
    yesLiquidity: 426_000,
    noLiquidity: 304_000,
    yesPercent: 58.4,
    resolveDate: '2026-06-07T12:00:00Z',
  },
  {
    id: 'dhl-transit',
    marketPubkey: 'TRANSjdWBpZMCkpR8gVDGSjZsJ3YqJQmfQpGPnR7kzA',
    category: 'DHL TRANSIT EXCEPTION',
    question: "WILL THE SHIPMENT ENCOUNTER A 'TRANSIT EXCEPTION'?",
    risk: 'MEDIUM' as const,
    liquidity: 1_530_000,
    yesLiquidity: 893_000,
    noLiquidity: 637_000,
    yesPercent: 58.4,
    resolveDate: '2026-06-15T12:00:00Z',
  },
  {
    id: 'weather-delay',
    marketPubkey: 'WEATHmBPeGPy8bkRS2bFdZ3fvqNFrgwHdFCQp7TvABC',
    category: 'WEATHER DELAY',
    question: 'WILL WEATHER DELAYS PUSH DELIVERY BY MORE THAN 24 HOURS?',
    risk: 'LOW' as const,
    liquidity: 1_255_000,
    yesLiquidity: 277_000,
    noLiquidity: 978_000,
    yesPercent: 22.1,
    resolveDate: '2026-06-18T12:00:00Z',
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
    <main className="min-h-screen bg-background relative overflow-hidden pt-20 pb-20 sm:pt-24 lg:pt-28">
      {/* Premium Atmospheric Backgrounds */}
      <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[160px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-0 right-1/4 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[160px] pointer-events-none -z-10"></div>

      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Top Header Section */}
        <header className="mb-12 flex flex-col justify-between gap-6 border-b border-border/50 pb-8 sm:mb-16 sm:gap-8 sm:pb-10 lg:flex-row lg:items-end">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
              <Zap size={12} />
              AETHER Protocol v2.4
            </div>
            <h1 className="text-[clamp(2.5rem,10vw,4.5rem)] font-black leading-[0.92] tracking-tighter text-foreground">
              {mode === "marketplace" ? "Procurement" : "Risk Desk"}
            </h1>
            <p className="max-w-2xl text-sm font-bold text-muted-foreground sm:text-base md:text-lg">
              {mode === "marketplace"
                ? "Unified B2B procurement terminal with integrated zkTLS logistics verification and automated escrow settlement."
                : "Predictive logistics hedge terminal. Analyze DHL event streams and secure your supply chain against latency."}
            </p>
          </div>

          <div className="w-full sm:w-auto lg:max-w-[360px]">
            <DashboardModeToggle mode={mode} onChange={handleModeChange} />
          </div>
        </header>

        <section className="relative min-h-[600px]">
          {/* Marketplace Grid */}
          <div
            className={`transition-all duration-500 ease-in-out ${mode === "marketplace" ? "translate-x-0 opacity-100" : "absolute inset-0 -translate-x-8 opacity-0 pointer-events-none"}`}
            aria-hidden={mode !== "marketplace"}
          >
            <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:gap-10">
              <aside className="h-fit">
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
