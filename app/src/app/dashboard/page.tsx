"use client";

import { useState } from "react";
import { DashboardModeToggle } from "@/components/dashboard/DashboardModeToggle";
import { HedgeCard } from "@/components/dashboard/HedgeCard";
import { MarketplaceFilters } from "@/components/dashboard/MarketplaceFilters";
import { ProductCard } from "@/components/dashboard/ProductCard";
import { useRouter } from "next/navigation";

const products = [
  {
    productId: "prod-001",
    title: "IP67 Industrial Router Module",
    category: "Industrial Components",
    vendor: "Nordic Mobility Supply",
    sellerWallet: "9B5X4z7Q1mP8vN2kL5jH9gF7sD3aE1rT",
    sellerTier: "distributor" as const,
    rating: 4.9,
    priceUsdc: 489,
    moq: 50,
    leadTimeDays: 6,
    usdcMint: "EPjFWaLb3hyccqaAjRmjRAmsPd83Un1Zc1zLH3BckKQi",
  },
  {
    productId: "prod-002",
    title: "Cold Chain Sensor Array (Gen 4)",
    category: "IoT Hardware",
    vendor: "Pacific Transit Systems",
    sellerWallet: "7kA2mQ9sB5cP1dE8jN6vL3hF4gR2wT5u",
    sellerTier: "manufacturer" as const,
    rating: 4.8,
    priceUsdc: 1720,
    moq: 10,
    leadTimeDays: 14,
    usdcMint: "EPjFWaLb3hyccqaAjRmjRAmsPd83Un1Zc1zLH3BckKQi",
  },
  {
    productId: "prod-003",
    title: "Secure Container Lock Controller",
    category: "Security Systems",
    vendor: "Anchor Field Devices",
    sellerWallet: "3mX7kL2pQ9sB4vE1jH8nF5gD2rT6aW9c",
    sellerTier: "wholesaler" as const,
    rating: 4.7,
    priceUsdc: 265,
    moq: 100,
    leadTimeDays: 4,
    usdcMint: "EPjFWaLb3hyccqaAjRmjRAmsPd83Un1Zc1zLH3BckKQi",
  },
  {
    productId: "prod-004",
    title: "EMI Shield Gasket Roll (100m)",
    category: "Industrial Components",
    vendor: "Nordic Mobility Supply",
    sellerWallet: "9B5X4z7Q1mP8vN2kL5jH9gF7sD3aE1rT",
    sellerTier: "distributor" as const,
    rating: 4.6,
    priceUsdc: 320,
    moq: 30,
    leadTimeDays: 3,
    usdcMint: "EPjFWaLb3hyccqaAjRmjRAmsPd83Un1Zc1zLH3BckKQi",
  },
];

const hedgeMarkets = [
  {
    marketType: "DHL Customs Event",
    title: "Will the shipment be held at Customs for > 48 hours?",
    yesProbability: 64.2,
    liquidity: 860000,
    expiry: "Resolves 2026-05-05 18:00 UTC",
    verificationSignal: "DHL event code: customs-clearance + hold duration",
  },
  {
    marketType: "DHL Delivery SLA",
    title: "Will the delivery be completed before 2026-05-07 12:00 UTC?",
    yesProbability: 58.4,
    liquidity: 420000,
    expiry: "Resolves 2026-05-07 12:00 UTC",
    verificationSignal: "DHL delivered timestamp vs target deadline",
  },
  {
    marketType: "DHL Transit Exception",
    title: "Will the shipment encounter a 'Transit Exception'?",
    yesProbability: 33.6,
    liquidity: 510000,
    expiry: "Resolves 2026-05-06 20:00 UTC",
    verificationSignal: "DHL status stream includes TRANSIT_EXCEPTION",
  },
];

export default function DashboardPage() {
  const [mode, setMode] = useState<"marketplace" | "hedge">("marketplace");
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const router = useRouter();

  const filteredProducts =
    selectedTier === "all"
      ? products
      : products.filter((p) => p.sellerTier === selectedTier);

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

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
            className={`transition-all duration-300 ease-in-out ${mode === "hedge" ? "pointer-events-auto translate-x-0 opacity-100" : "pointer-events-none absolute inset-0 translate-x-3 opacity-0"}`}
            aria-hidden={mode !== "hedge"}
          >
            <div className="space-y-4">
              <div className="grid gap-3 rounded-lg border border-border bg-card p-4 shadow-sm md:grid-cols-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Open Hedge Positions</p>
                  <p className="font-mono text-xl font-semibold tabular-nums text-card-foreground">742</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">24h Hedge Volume</p>
                  <p className="font-mono text-xl font-semibold tabular-nums text-card-foreground">$2.3M</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Avg Fill</p>
                  <p className="font-mono text-xl font-semibold tabular-nums text-card-foreground">118ms</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Risk Coverage</p>
                  <p className="font-mono text-xl font-semibold tabular-nums text-card-foreground">93.2%</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {hedgeMarkets.map((market) => (
                  <HedgeCard key={market.title} {...market} />
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
