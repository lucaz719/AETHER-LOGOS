"use client";

import { ArrowRight, Shield, Package, CheckCircle, Lock, Zap, TrendingUp, Globe } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="overflow-hidden bg-background text-foreground">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        {/* Background glow orbs */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/3 top-1/4 h-[480px] w-[480px] rounded-full bg-indigo-500/8 blur-[120px]" />
          <div className="absolute right-1/4 bottom-1/4 h-[360px] w-[360px] rounded-full bg-cyan-500/6 blur-[100px]" />
        </div>

        <div className="mx-auto max-w-4xl space-y-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Enterprise-Grade B2B Procurement on Solana
          </div>

          {/* Headline — escrow first, hedge markets as reveal */}
          <div className="space-y-5">
            <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl leading-[1.08]">
              The{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                Secure Escrow
              </span>{" "}
              Marketplace<br className="hidden sm:block" /> for Global Trade
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed">
              Buy and sell industrial goods with confidence. Every order is protected by smart contract escrow — funds only release when delivery is verified on-chain.
            </p>
          </div>

          {/* Primary CTAs */}
          <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:justify-center">
            <Link
              href="/onboarding"
              id="hero-get-started"
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500 hover:shadow-xl hover:shadow-indigo-500/30"
            >
              Start Trading
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/dashboard"
              id="hero-browse-marketplace"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card/60 px-8 py-3.5 text-sm font-semibold text-foreground backdrop-blur-sm transition-all hover:border-indigo-500/40 hover:bg-card"
            >
              Browse Marketplace
              <ArrowRight className="h-4 w-4 opacity-60" />
            </Link>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-3 pt-10 sm:gap-5">
            {[
              { value: "$14.9M", label: "Escrow TVL" },
              { value: "1,284",  label: "Active RFQs" },
              { value: "21.4h",  label: "Avg Settlement" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border/50 bg-card/40 p-4 backdrop-blur-sm"
              >
                <p className="font-mono text-2xl font-bold tabular-nums text-foreground">{stat.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How Escrow Works ─────────────────────────────────── */}
      <section className="border-t border-border/40 bg-card/20 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">How it works</p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Procurement protected at every step
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Three steps from order to verified delivery — fully on-chain, no middlemen, no trust required.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                step: "01",
                icon: Lock,
                title: "Connect & Browse",
                description: "Link your Solana wallet and explore products from Direct Manufacturers, Verified Wholesalers, and Certified Distributors — each audited on-chain.",
                accent: "from-indigo-500/20 to-indigo-600/10",
                border: "border-indigo-500/20",
              },
              {
                step: "02",
                icon: Package,
                title: "Place Order in Escrow",
                description: "USDC is locked in a verified smart contract the moment you confirm. The vendor ships, tracking begins, and your funds stay safe until delivery.",
                accent: "from-cyan-500/20 to-cyan-600/10",
                border: "border-cyan-500/20",
              },
              {
                step: "03",
                icon: CheckCircle,
                title: "Delivery Verified, Funds Released",
                description: "Our oracle monitors shipment status. On confirmed delivery, escrow auto-releases to the seller. Dispute at any point — funds stay locked until resolved.",
                accent: "from-green-500/20 to-green-600/10",
                border: "border-green-500/20",
              },
            ].map((item) => (
              <div
                key={item.step}
                className={`group relative overflow-hidden rounded-2xl border ${item.border} bg-gradient-to-br ${item.accent} p-7 backdrop-blur-sm transition-all hover:scale-[1.01] hover:shadow-lg`}
              >
                <div className="mb-5 flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-muted-foreground">{item.step}</span>
                  <item.icon className="h-5 w-5 text-foreground/70" />
                </div>
                <h3 className="mb-3 text-lg font-bold text-foreground">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Marketplace Features ─────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Platform</p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Built for enterprise trust
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Shield,
                title: "On-Chain Escrow",
                description: "Smart contract holds funds until delivery is cryptographically verified. Zero counterparty risk.",
              },
              {
                icon: Globe,
                title: "Tiered Vendor Network",
                description: "Direct Manufacturers, Verified Wholesalers, and Certified Distributors — each tier with on-chain credentials.",
              },
              {
                icon: Zap,
                title: "Solana-Speed Settlement",
                description: "Sub-second transaction finality. No delayed clearance, no banking hours, no borders.",
              },
              {
                icon: Package,
                title: "Live Shipment Tracking",
                description: "DHL oracle integration streams tracking status directly into your escrow contract.",
              },
              {
                icon: Lock,
                title: "Dispute Resolution",
                description: "Open a dispute at any stage. Funds stay locked until arbitration resolves — never at risk.",
              },
              {
                icon: CheckCircle,
                title: "Graphite Ledger Audit",
                description: "Immutable on-chain record of every order, shipment event, and payment. Enterprise-grade compliance.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-border/50 bg-card/30 p-6 backdrop-blur-sm transition-all hover:border-indigo-500/30 hover:bg-card/60"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
                  <feature.icon className="h-5 w-5 text-indigo-400" />
                </div>
                <h3 className="mb-2 font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Hedge Markets WOW Moment ──────────────────────────── */}
      <section className="relative overflow-hidden border-t border-border/40 px-4 py-20 sm:px-6 lg:px-8">
        {/* Dark dramatic background for contrast */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-950/20 to-indigo-950/30" />
          <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/8 blur-[140px]" />
        </div>

        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-300">
            <TrendingUp className="h-3.5 w-3.5" />
            Something More
          </div>

          <h2 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl leading-tight">
            Didn't know you could{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              hedge logistics risk
            </span>
            .
          </h2>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground">
            Trade prediction markets on delivery outcomes — customs delays, SLA breaches, transit exceptions. Your supply chain risk, quantified and traded.
          </p>

          {/* Live-ish market preview cards */}
          <div className="mb-10 grid gap-4 sm:grid-cols-3">
            {[
              { event: "DHL Customs Hold", prob: 64, side: "YES", color: "text-green-400", bar: "bg-green-500" },
              { event: "Delivery SLA Miss", prob: 42, side: "NO",  color: "text-red-400",   bar: "bg-red-500" },
              { event: "Transit Exception", prob: 34, side: "YES", color: "text-amber-400", bar: "bg-amber-500" },
            ].map((m) => (
              <div
                key={m.event}
                className="rounded-2xl border border-white/8 bg-white/4 p-5 text-left backdrop-blur-sm"
              >
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{m.event}</p>
                <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full ${m.bar}/70 rounded-full transition-all duration-1000`}
                    style={{ width: `${m.prob}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${m.color}`}>{m.side}</span>
                  <span className="font-mono text-lg font-bold text-foreground">{m.prob}%</span>
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/markets"
            id="markets-explore"
            className="group inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-8 py-3.5 text-sm font-semibold text-indigo-300 backdrop-blur-sm transition-all hover:border-indigo-400/60 hover:bg-indigo-500/20 hover:text-indigo-200"
          >
            Explore Hedge Markets
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section className="border-t border-border/40 bg-card/20 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Ready to trade with confidence?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Join enterprise buyers and verified vendors on the only marketplace where escrow is the default.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/onboarding"
              id="final-cta-start"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500"
            >
              Get Started — It's Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard"
              id="final-cta-browse"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card/60 px-8 py-3.5 text-sm font-semibold text-foreground backdrop-blur-sm transition-all hover:border-indigo-500/40 hover:bg-card"
            >
              Browse Marketplace
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-border/40 bg-card/30 px-4 py-8 sm:px-6 lg:px-8 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
          <span className="text-sm font-semibold tracking-tight text-foreground">◯ AETHER-LOGOS</span>
          <div className="flex gap-6 text-sm text-muted-foreground">
            {["Docs", "API", "Support", "Terms"].map((l) => (
              <a key={l} href="#" className="transition-colors hover:text-foreground">{l}</a>
            ))}
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground border-t border-border/40 pt-6">
          © 2026 AETHER-LOGOS. Built on Solana. Enterprise logistics settled on-chain.
        </p>
      </footer>
    </div>
  );
}
