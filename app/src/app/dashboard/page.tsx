"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Lock } from "lucide-react";
import { DashboardModeToggle } from "@/components/dashboard/DashboardModeToggle";
import { MarketplaceFilters } from "@/components/dashboard/MarketplaceFilters";
import { ProductCard } from "@/components/dashboard/ProductCard";
import { useRouter } from "next/navigation";

const products = [
  {
    productId: "prod-001",
    title: "Titanium CNC Milling Spindle (20K RPM)",
    category: "Industrial Components",
    vendor: "Nordic Mobility Supply",
    sellerWallet: "9B5X4z7Q1mP8vN2kL5jH9gF7sD3aE1rT",
    sellerTier: "manufacturer" as const,
    rating: 4.9,
    priceUsdc: 8950,
    moq: 2,
    leadTimeDays: 18,
    usdcMint: "EPjFWaLb3hyccqaAjRmjRAmsPd83Un1Zc1zLH3BckKQi",
  },
  {
    productId: "prod-002",
    title: "Cryogenic Bio-Transport Container (2L)",
    category: "Cold Chain",
    vendor: "Pacific Transit Systems",
    sellerWallet: "7kA2mQ9sB5cP1dE8jN6vL3hF4gR2wT5u",
    sellerTier: "manufacturer" as const,
    rating: 4.95,
    priceUsdc: 3200,
    moq: 5,
    leadTimeDays: 14,
    usdcMint: "EPjFWaLb3hyccqaAjRmjRAmsPd83Un1Zc1zLH3BckKQi",
  },
  {
    productId: "prod-003",
    title: "Industrial-Grade RFID Inventory Scanner",
    category: "IoT Hardware",
    vendor: "Anchor Field Devices",
    sellerWallet: "3mX7kL2pQ9sB4vE1jH8nF5gD2rT6aW9c",
    sellerTier: "wholesaler" as const,
    rating: 4.7,
    priceUsdc: 1850,
    moq: 15,
    leadTimeDays: 9,
    usdcMint: "EPjFWaLb3hyccqaAjRmjRAmsPd83Un1Zc1zLH3BckKQi",
  },
  {
    productId: "prod-004",
    title: "Military-Grade Biometric Lock Assembly",
    category: "Security Systems",
    vendor: "SecureVault Industries",
    sellerWallet: "2pR8vN4jK1sL9tM6wX3yE7zQ5aB8cD0f",
    sellerTier: "manufacturer" as const,
    rating: 4.8,
    priceUsdc: 2750,
    moq: 8,
    leadTimeDays: 12,
    usdcMint: "EPjFWaLb3hyccqaAjRmjRAmsPd83Un1Zc1zLH3BckKQi",
  },
  {
    productId: "prod-005",
    title: "EMI Shield Gasket Roll (100m)",
    category: "Industrial Components",
    vendor: "Nordic Mobility Supply",
    sellerWallet: "9B5X4z7Q1mP8vN2kL5jH9gF7sD3aE1rT",
    sellerTier: "distributor" as const,
    rating: 4.6,
    priceUsdc: 420,
    moq: 30,
    leadTimeDays: 5,
    usdcMint: "EPjFWaLb3hyccqaAjRmjRAmsPd83Un1Zc1zLH3BckKQi",
  },
  {
    productId: "prod-006",
    title: "Real-Time Temperature & Humidity Sensor",
    category: "IoT Hardware",
    vendor: "TechFlow Innovations",
    sellerWallet: "4dS9vL2bP6jH8nK5mR3tW1xY4aZ7cE0f",
    sellerTier: "wholesaler" as const,
    rating: 4.72,
    priceUsdc: 245,
    moq: 100,
    leadTimeDays: 7,
    usdcMint: "EPjFWaLb3hyccqaAjRmjRAmsPd83Un1Zc1zLH3BckKQi",
  },
  {
    productId: "prod-007",
    title: "Temperature-Controlled Gel Pack (500g)",
    category: "Cold Chain",
    vendor: "Logistics Excellence Ltd",
    sellerWallet: "5eT0wM3cQ7kL1pS9mN6jX2aU5bV8dW4g",
    sellerTier: "distributor" as const,
    rating: 4.85,
    priceUsdc: 18,
    moq: 500,
    leadTimeDays: 3,
    usdcMint: "EPjFWaLb3hyccqaAjRmjRAmsPd83Un1Zc1zLH3BckKQi",
  },
  {
    productId: "prod-008",
    title: "Quantum-Encrypted Key Management System",
    category: "Security Systems",
    vendor: "CyberShield Pro",
    sellerWallet: "6fU1xN4dR8sL2qM9bP5jX3aK7cT0eW6h",
    sellerTier: "manufacturer" as const,
    rating: 4.92,
    priceUsdc: 15400,
    moq: 1,
    leadTimeDays: 21,
    usdcMint: "EPjFWaLb3hyccqaAjRmjRAmsPd83Un1Zc1zLH3BckKQi",
  },
  {
    productId: "prod-009",
    title: "Precision Bearing Set (SKF, 50mm)",
    category: "Industrial Components",
    vendor: "Nordic Mobility Supply",
    sellerWallet: "9B5X4z7Q1mP8vN2kL5jH9gF7sD3aE1rT",
    sellerTier: "distributor" as const,
    rating: 4.78,
    priceUsdc: 680,
    moq: 20,
    leadTimeDays: 8,
    usdcMint: "EPjFWaLb3hyccqaAjRmjRAmsPd83Un1Zc1zLH3BckKQi",
  },
  {
    productId: "prod-010",
    title: "Wireless IoT Gateway (5G-Ready)",
    category: "IoT Hardware",
    vendor: "TechFlow Innovations",
    sellerWallet: "4dS9vL2bP6jH8nK5mR3tW1xY4aZ7cE0f",
    sellerTier: "manufacturer" as const,
    rating: 4.88,
    priceUsdc: 3850,
    moq: 10,
    leadTimeDays: 11,
    usdcMint: "EPjFWaLb3hyccqaAjRmjRAmsPd83Un1Zc1zLH3BckKQi",
  },
  {
    productId: "prod-011",
    title: "Pharmaceutical-Grade Insulated Box (10L)",
    category: "Cold Chain",
    vendor: "Logistics Excellence Ltd",
    sellerWallet: "5eT0wM3cQ7kL1pS9mN6jX2aU5bV8dW4g",
    sellerTier: "wholesaler" as const,
    rating: 4.76,
    priceUsdc: 125,
    moq: 200,
    leadTimeDays: 6,
    usdcMint: "EPjFWaLb3hyccqaAjRmjRAmsPd83Un1Zc1zLH3BckKQi",
  },
  {
    productId: "prod-012",
    title: "ISO 27001 Certified Security Module",
    category: "Security Systems",
    vendor: "SecureVault Industries",
    sellerWallet: "2pR8vN4jK1sL9tM6wX3yE7zQ5aB8cD0f",
    sellerTier: "distributor" as const,
    rating: 4.81,
    priceUsdc: 890,
    moq: 50,
    leadTimeDays: 10,
    usdcMint: "EPjFWaLb3hyccqaAjRmjRAmsPd83Un1Zc1zLH3BckKQi",
  },
];

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

export default function DashboardPage() {
  const [mode, setMode] = useState<"marketplace" | "hedge">("marketplace");
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [selectedMarketIdx, setSelectedMarketIdx] = useState<number | null>(null);
  const [stakeAmount, setStakeAmount] = useState("100");
  const [selectedSide, setSelectedSide] = useState<"yes" | "no">("yes");
  const [walletConnected] = useState(false);
  const router = useRouter();

  const filteredProducts =
    selectedTier === "all"
      ? products
      : products.filter((p) => p.sellerTier === selectedTier);

  const selectedMarket = selectedMarketIdx !== null ? hedgeMarkets[selectedMarketIdx] : null;

  const getRiskColor = (level: "low" | "medium" | "high") => {
    switch (level) {
      case "low":
        return "text-green-400";
      case "medium":
        return "text-amber-400";
      case "high":
        return "text-red-400";
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
  }) => {
    const params = new URLSearchParams();
    params.set("productId", payload.productId);
    params.set("title", payload.title);
    params.set("sellerWallet", payload.sellerWallet);
    params.set("usdcMint", payload.usdcMint);
    params.set("tier", payload.tier);
    params.set("moq", payload.moq.toString());
    params.set("leadTimeDays", payload.leadTimeDays.toString());
    router.push(`/trades?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-10 pt-8 sm:px-6 lg:px-8">
        <header className="space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Workspace</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Escrow marketplace and hedge execution in one terminal.
          </h1>
          <p className="mx-auto max-w-3xl text-sm text-muted-foreground md:text-base">
            Live procurement workflows and logistics hedge markets unified under one Graphite Ledger control surface.
          </p>
        </header>

        <DashboardModeToggle mode={mode} onChange={setMode} />

        <section className="relative min-h-[720px]">
          <div
            className={`transition-all duration-300 ease-in-out ${mode === "marketplace" ? "pointer-events-auto translate-x-0 opacity-100" : "pointer-events-none absolute inset-0 -translate-x-3 opacity-0"}`}
            aria-hidden={mode !== "marketplace"}
          >
            <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
              <MarketplaceFilters
                categories={["Industrial Components", "IoT Hardware", "Cold Chain", "Security Systems"]}
                selectedTier={selectedTier}
                onTierChange={setSelectedTier}
              />
              <div className="space-y-4">
                <div className="grid gap-3 rounded-lg border border-border bg-card p-4 shadow-sm md:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Active RFQs</p>
                    <p className="font-mono text-xl font-semibold tabular-nums text-card-foreground">1,284</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Escrow TVL</p>
                    <p className="font-mono text-xl font-semibold tabular-nums text-card-foreground">$14.9M</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Avg Lock Time</p>
                    <p className="font-mono text-xl font-semibold tabular-nums text-card-foreground">21.4h</p>
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-20">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.productId}
                      {...product}
                      onBuy={handleProductBuy}
                    />
                  ))}
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
              
              <div className="grid gap-3 rounded-lg card-elevated p-4 md:grid-cols-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Total Liquidity</p>
                  <p className="font-mono text-xl font-semibold text-foreground">$5.2M</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">24h Volume</p>
                  <p className="font-mono text-xl font-semibold text-foreground">$842K</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Active Markets</p>
                  <p className="font-mono text-xl font-semibold text-foreground">{hedgeMarkets.length}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Avg Resolution</p>
                  <p className="font-mono text-xl font-semibold text-foreground">2.4 days</p>
                </div>
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

                        {/* Probability Bars */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-2 text-xs font-medium text-foreground">
                              <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                              Yes
                            </span>
                            <span className="font-mono text-xs font-semibold text-green-600">{market.yesProbability.toFixed(1)}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full bg-gradient-to-r from-green-500 to-green-400"
                              style={{ width: `${market.yesProbability}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-2">
                            <span className="flex items-center gap-2 text-xs font-medium text-foreground">
                              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                              No
                            </span>
                            <span className="font-mono text-xs font-semibold text-red-600">{(100 - market.yesProbability).toFixed(1)}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full bg-gradient-to-r from-red-500 to-red-400"
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
                <div className="fixed right-0 top-32 h-screen w-full max-w-sm z-50 pointer-events-auto">
                  <div className="h-full glass-header p-6 rounded-l-2xl flex flex-col shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
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
                    <div className="flex-1 overflow-y-auto space-y-4">
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
                                ? "border-green-500 bg-green-500/10 text-green-700"
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
                                ? "border-red-500 bg-red-500/10 text-red-700"
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
                      <div className="card-elevated p-4 bg-gradient-to-br from-green-50 to-green-50/50 border-green-200">
                        <p className="text-xs text-muted-foreground mb-1.5 font-semibold">Potential Payout</p>
                        <p className="font-mono text-2xl font-bold text-green-700">
                          ${(Number(stakeAmount) * (selectedSide === "yes" ? 1.55 : 2.1)).toFixed(2)}
                        </p>
                        <p className="text-xs text-green-600 mt-2">
                          ROI: {(((selectedSide === "yes" ? 1.55 : 2.1) - 1) * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>

                    {/* Footer CTA */}
                    <div className="pt-4 border-t border-border-light space-y-2 mt-4">
                      {!walletConnected ? (
                        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-center">
                          <p className="text-sm text-amber-700 flex items-center justify-center gap-2">
                            <Lock className="h-4 w-4" />
                            Connect wallet to trade
                          </p>
                        </div>
                      ) : (
                        <button className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold transition-all duration-200 hover:shadow-lg active:scale-95">
                          Place Hedge
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
