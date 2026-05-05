"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TrendingUp, TrendingDown, Lock } from "lucide-react";
import { DashboardModeToggle } from "@/components/dashboard/DashboardModeToggle";
import { MarketplaceFilters } from "@/components/dashboard/MarketplaceFilters";
import { ProductCard } from "@/components/dashboard/ProductCard";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";

const WalletMultiButton = dynamic(
  async () => {
    const { WalletMultiButton } = await import('@solana/wallet-adapter-react-ui');
    return { default: WalletMultiButton };
  },
  { ssr: false }
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
  const [selectedMarketIdx, setSelectedMarketIdx] = useState<number | null>(null);
  const [stakeAmount, setStakeAmount] = useState("100");
  const [selectedSide, setSelectedSide] = useState<"yes" | "no">("yes");
  const [products, setProducts] = useState<DashboardProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const { connected: walletConnected } = useWallet();

  useEffect(() => {
    const loadProducts = async () => {
      setProductsLoading(true);
      try {
        const productsRes = await fetch(`${API}/api/products`);
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
  }, []);

  const filteredProducts =
    selectedTier === "all"
      ? products
      : products.filter((p) => p.sellerTier === selectedTier);

  const selectedMarket = selectedMarketIdx !== null ? hedgeMarkets[selectedMarketIdx] : null;

  const getRiskColor = (level: "low" | "medium" | "high") => {
    switch (level) {
      case "low":
        return "text-green-600 dark:text-green-400";
      case "medium":
        return "text-amber-600 dark:text-amber-400";
      case "high":
        return "text-red-600 dark:text-red-400";
    }
  };

  const getRiskBgColor = (level: "low" | "medium" | "high") => {
    switch (level) {
      case "low":
        return "bg-green-500/10 border border-green-500/30";
      case "medium":
        return "bg-amber-500/10 border border-amber-500/30";
      case "high":
        return "bg-red-500/10 border border-red-500/30";
    }
  };

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
    <main className="min-h-screen bg-background relative overflow-hidden pt-24 pb-20">
      {/* Premium Atmospheric Backgrounds */}
      <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[160px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[160px] pointer-events-none"></div>
      
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Top Header Section */}
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-2">
            <h1 className="text-6xl font-black tracking-tighter text-foreground">
              {mode === "marketplace" ? "Procurement" : "Risk Desk"}
            </h1>
            <p className="text-lg font-bold text-muted-foreground">
              {mode === "marketplace" 
                ? "Global B2B sourcing with verified zkTLS delivery proof." 
                : "Logistics outcome prediction and risk hedging terminal."}
            </p>
          </div>
          
          <div className="w-full md:w-auto">
            <DashboardModeToggle mode={mode} onChange={handleModeChange} />
          </div>
        </header>

        <section className="relative min-h-[800px]">
          <div
            className={`transition-all duration-300 ease-in-out ${mode === "marketplace" ? "pointer-events-auto translate-x-0 opacity-100" : "pointer-events-none absolute inset-0 -translate-x-3 opacity-0"}`}
            aria-hidden={mode !== "marketplace"}
          >
            <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
              <MarketplaceFilters
                categories={["Industrial Components", "IoT Hardware", "Cold Chain", "Security Systems"]}
                selectedTier={selectedTier}
                onTierChange={setSelectedTier}
              />
              <div className="space-y-6">


                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 pb-20">
                  {productsLoading ? (
                    <div className="col-span-full text-sm text-muted-foreground">Loading products...</div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="col-span-full text-sm text-muted-foreground">No products found.</div>
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
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Hedge Markets Terminal</h2>
                <p className="text-sm text-muted-foreground mt-1">Predict logistics outcomes and hedge your exposure</p>
              </div>
              


              {/* Markets Grid */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-foreground">Available Markets</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {hedgeMarkets.map((market, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedMarketIdx(idx)}
                      className={`group relative rounded-lg border transition-all duration-200 text-left ${
                        selectedMarketIdx === idx
                          ? "card-elevated border-primary/50 shadow-lg"
                          : "card-plain hover:shadow-md"
                      }`}
                    >
                      <div className="space-y-4 p-5">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{market.marketType}</p>
                            <h3 className="font-semibold text-foreground leading-snug">{market.title}</h3>
                          </div>
                          <div className={`shrink-0 rounded px-2.5 py-1 text-xs font-semibold ${getRiskBgColor(market.riskLevel)}`}>
                            <span className={getRiskColor(market.riskLevel)}>
                              {market.riskLevel.charAt(0).toUpperCase() + market.riskLevel.slice(1)}
                            </span>
                          </div>
                        </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="flex items-center gap-2 text-xs font-medium text-foreground">
                                <TrendingUp className="h-3.5 w-3.5 text-purple-500" />
                                Yes
                              </span>
                              <span className="font-mono text-xs font-semibold text-purple-600">{market.yesProbability.toFixed(1)}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-secondary/50">
                              <div
                                className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-400"
                                style={{ width: `${market.yesProbability}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-1">
                              <span className="flex items-center gap-2 text-xs font-medium text-foreground">
                                <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
                                No
                              </span>
                              <span className="font-mono text-xs font-semibold text-rose-600">{(100 - market.yesProbability).toFixed(1)}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-secondary/50">
                              <div
                                className="h-full bg-gradient-to-r from-rose-500 to-pink-400"
                                style={{ width: `${100 - market.yesProbability}%` }}
                              />
                            </div>
                          </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-2 border-t border-border-light pt-3">
                          <div className="text-left">
                            <p className="text-xs text-muted-foreground">Liquidity</p>
                            <p className="font-mono text-xs font-semibold text-foreground">
                              ${((market.yesLiquidity + market.noLiquidity) / 1_000_000).toFixed(1)}M
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Expires</p>
                            <p className="font-mono text-xs font-semibold text-foreground">Soon</p>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Side-Sheet Overlay */}
            {selectedMarket && (
              <>
                <div
                  className="fixed inset-0 bg-black/20 transition-opacity duration-200 z-40 pointer-events-auto"
                  onClick={() => setSelectedMarketIdx(-1)}
                  aria-label="Close side panel"
                />
                
                {/* Side-Sheet Panel */}
                <div className="fixed right-0 top-24 bottom-0 w-full max-w-sm z-50 pointer-events-auto flex flex-col">
                  <div className="glass-header rounded-l-2xl flex flex-col shadow-2xl h-full overflow-hidden p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6 flex-shrink-0">
                      <h3 className="font-semibold text-foreground">Place Hedge</h3>
                      <button
                        onClick={() => setSelectedMarketIdx(-1)}
                        className="p-1.5 hover:bg-secondary rounded-lg transition"
                        aria-label="Close"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                      {/* Market Details */}
                      <div className="card-plain p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2">Market</p>
                        <p className="font-semibold text-foreground">{selectedMarket.title}</p>
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{selectedMarket.verificationSignal}</p>
                      </div>

                      {/* Side Selection */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Your Prediction</p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setSelectedSide("yes")}
                            className={`rounded-lg border-2 px-3 py-3 text-sm font-semibold transition-all duration-150 ${
                              selectedSide === "yes"
                                ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400"
                                : "border-border-light bg-secondary text-muted-foreground hover:border-green-300"
                            }`}
                          >
                            YES
                            <div className="text-xs font-normal text-muted-foreground mt-0.5">
                              {selectedMarket.yesProbability.toFixed(1)}%
                            </div>
                          </button>
                          <button
                            onClick={() => setSelectedSide("no")}
                            className={`rounded-lg border-2 px-3 py-3 text-sm font-semibold transition-all duration-150 ${
                              selectedSide === "no"
                                ? "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400"
                                : "border-border-light bg-secondary text-muted-foreground hover:border-red-300"
                            }`}
                          >
                            NO
                            <div className="text-xs font-normal text-muted-foreground mt-0.5">
                              {(100 - selectedMarket.yesProbability).toFixed(1)}%
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Stake Amount */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Stake Amount (USDC)</p>
                        <input
                          type="number"
                          min="1"
                          value={stakeAmount}
                          onChange={(e) => setStakeAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full rounded-lg border border-border-light bg-secondary px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      </div>

                      {/* Payout Estimate */}
                      <div className="card-elevated p-4 bg-gradient-to-br from-green-50 dark:from-green-950/20 to-green-50/50 dark:to-green-950/10 border border-green-200 dark:border-green-900/30">
                        <p className="text-xs text-muted-foreground mb-1.5 font-semibold">Potential Payout</p>
                        <p className="font-mono text-2xl font-bold text-green-700 dark:text-green-400">
                          ${(Number(stakeAmount) * (selectedSide === "yes" ? 1.55 : 2.1)).toFixed(2)}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                          ROI: {(((selectedSide === "yes" ? 1.55 : 2.1) - 1) * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>

                    {/* Footer CTA - Sticky */}
                    <div className="pt-4 border-t border-border-light space-y-2 mt-4 flex-shrink-0">
                      {!walletConnected ? (
                        <div className="w-full flex justify-center py-1 [&>.wallet-adapter-button]:w-full [&>.wallet-adapter-button]:justify-center [&>.wallet-adapter-button]:!bg-indigo-600 [&>.wallet-adapter-button]:hover:!bg-indigo-500 [&>.wallet-adapter-button]:!h-11 [&>.wallet-adapter-button]:!rounded-lg [&>.wallet-adapter-button]:!text-sm [&>.wallet-adapter-button]:!font-bold [&>.wallet-adapter-button]:transition-all">
                          <WalletMultiButton />
                        </div>
                      ) : (
                        <button className="w-full h-11 rounded-lg bg-indigo-600 text-white font-semibold transition-all duration-200 hover:shadow-lg hover:bg-indigo-500 active:scale-95">
                          Confirm Hedge
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
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
