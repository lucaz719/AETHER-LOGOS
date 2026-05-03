'use client';

import { useState } from "react";
import { TrendingUp, TrendingDown, Lock } from "lucide-react";

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

export default function MarketsPage() {
  const [selectedMarketIdx, setSelectedMarketIdx] = useState<number | null>(null);
  const [stakeAmount, setStakeAmount] = useState("100");
  const [selectedSide, setSelectedSide] = useState<"yes" | "no">("yes");
  const [walletConnected] = useState(false);

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

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 space-y-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Hedge Markets Terminal</h1>
            <p className="text-muted-foreground">Real-time logistics risk prediction markets. Trade probabilities on shipment outcomes.</p>
          </div>
          <div className="grid gap-3 rounded-lg border border-border/50 bg-card/30 p-4 backdrop-blur-sm md:grid-cols-4">
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
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          {/* Markets Grid */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Available Markets</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {hedgeMarkets.map((market, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedMarketIdx(idx)}
                  className={`group relative rounded-lg border transition-all backdrop-blur-sm ${
                    selectedMarketIdx === idx
                      ? "border-primary/80 bg-primary/10 shadow-lg shadow-primary/20"
                      : "border-border/50 bg-card/30 hover:border-primary/50 hover:bg-card/50"
                  }`}
                >
                  <div className="space-y-4 p-5 text-left">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{market.marketType}</p>
                        <h3 className="font-semibold text-foreground leading-snug">{market.title}</h3>
                      </div>
                      <div className={`shrink-0 rounded px-2.5 py-1 text-xs font-semibold ${getRiskBgColor(market.riskLevel)}`}>
                        <span className={getRiskColor(market.riskLevel)}>
                          {market.riskLevel.charAt(0).toUpperCase() + market.riskLevel.slice(1)} Risk
                        </span>
                      </div>
                    </div>

                    {/* Probability Bars */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-xs font-medium text-foreground">
                          <TrendingUp className="h-3.5 w-3.5 text-green-400" />
                          Yes
                        </span>
                        <span className="font-mono text-xs font-semibold text-green-400">{market.yesProbability.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-green-400"
                          style={{ width: `${market.yesProbability}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2">
                        <span className="flex items-center gap-2 text-xs font-medium text-foreground">
                          <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                          No
                        </span>
                        <span className="font-mono text-xs font-semibold text-red-400">{(100 - market.yesProbability).toFixed(1)}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-gradient-to-r from-red-500 to-red-400"
                          style={{ width: `${100 - market.yesProbability}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 border-t border-border/30 pt-3">
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

          {/* Trade Panel */}
          <div className="lg:sticky lg:top-20">
            {selectedMarket ? (
              <div className="rounded-lg border border-primary/50 bg-card/50 p-6 backdrop-blur-sm">
                <h3 className="font-semibold text-foreground mb-4">Place Hedge</h3>

                <div className="space-y-4">
                  {/* Market Details */}
                  <div className="space-y-2 rounded-lg bg-background/50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Market</p>
                    <p className="text-sm text-foreground">{selectedMarket.title}</p>
                  </div>

                  {/* Side Selection */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Prediction</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSelectedSide("yes")}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                          selectedSide === "yes"
                            ? "border-green-500/50 bg-green-500/10 text-green-400"
                            : "border-border/30 bg-background/50 text-muted-foreground hover:border-green-500/30"
                        }`}
                      >
                        YES - {selectedMarket.yesProbability.toFixed(1)}%
                      </button>
                      <button
                        onClick={() => setSelectedSide("no")}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                          selectedSide === "no"
                            ? "border-red-500/50 bg-red-500/10 text-red-400"
                            : "border-border/30 bg-background/50 text-muted-foreground hover:border-red-500/30"
                        }`}
                      >
                        NO - {(100 - selectedMarket.yesProbability).toFixed(1)}%
                      </button>
                    </div>
                  </div>

                  {/* Stake Amount */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Amount (USDC)</p>
                    <input
                      type="number"
                      min="1"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>

                  {/* Payout Estimate */}
                  <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-3">
                    <p className="text-xs text-muted-foreground mb-1">Potential Payout</p>
                    <p className="font-mono text-lg font-semibold text-green-400">
                      ${(Number(stakeAmount) * (selectedSide === "yes" ? 1.55 : 2.1)).toFixed(2)}
                    </p>
                  </div>

                  {/* CTA */}
                  {!walletConnected ? (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-center">
                      <p className="text-sm text-amber-400 flex items-center justify-center gap-2">
                        <Lock className="h-4 w-4" />
                        Connect wallet to trade
                      </p>
                    </div>
                  ) : (
                    <button className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground transition hover:shadow-lg hover:shadow-primary/20">
                      Place Hedge
                    </button>
                  )}
                </div>

                {/* Market Info */}
                <div className="mt-4 border-t border-border/30 pt-3 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Verification</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{selectedMarket.verificationSignal}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-border/50 bg-card/30 p-8 text-center backdrop-blur-sm">
                <p className="text-sm text-muted-foreground">Select a market to place a hedge</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
