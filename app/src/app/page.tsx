"use client";

import { ArrowRight, Shield, TrendingUp, Zap, CheckCircle, Lock } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="overflow-hidden bg-background text-foreground">
      {/* Navigation */}
      <nav
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "border-b border-border/50 bg-background/95 backdrop-blur-md"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500/80 to-blue-600/80 blur-sm" />
            <span className="font-semibold tracking-tight text-foreground">AETHER-LOGOS</span>
          </div>
          <div className="hidden gap-6 md:flex">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <Link href="/markets" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Markets
            </Link>
            <Link href="/onboarding" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Get Started
            </Link>
          </div>
          <Link
            href="/onboarding"
            className="group inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:shadow-lg hover:shadow-primary/20"
          >
            Start Trading
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-16 sm:px-6 lg:px-8">
        {/* Animated background gradient orbs */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-gradient-to-r from-cyan-500/10 to-blue-500/10 blur-3xl" />
          <div className="absolute right-1/4 top-1/3 h-96 w-96 rounded-full bg-gradient-to-r from-blue-500/10 to-indigo-500/10 blur-3xl" />
        </div>

        <div className="mx-auto max-w-4xl space-y-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/50 px-4 py-2 text-xs font-medium text-muted-foreground backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-green-500/80" />
            Enterprise-Grade B2B Logistics
          </div>

          {/* Hero Headline */}
          <div className="space-y-4">
            <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Escrow <span className="bg-gradient-to-r from-cyan-400/80 to-blue-500/80 bg-clip-text text-transparent">Marketplace</span> meets <span className="bg-gradient-to-r from-blue-400/80 to-cyan-500/80 bg-clip-text text-transparent">Hedge Markets</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Execute verified procurement workflows with on-chain escrow settlement and logistics risk hedging. Built for enterprises that demand trust, speed, and transparency.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-4 pt-8 sm:flex-row sm:justify-center">
            <Link
              href="/onboarding"
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg bg-primary px-8 py-3 font-semibold text-primary-foreground transition-all hover:shadow-xl hover:shadow-primary/20"
            >
              <span className="relative z-10 flex items-center gap-2">
                Start Trading
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
              <div className="absolute inset-0 -z-0 bg-gradient-to-r from-primary to-primary/80 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card/50 px-8 py-3 font-semibold text-foreground transition-all hover:border-primary hover:bg-card backdrop-blur-sm"
            >
              View Markets
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-12 sm:gap-6">
            <div className="rounded-lg border border-border/50 bg-card/30 p-4 backdrop-blur-sm">
              <p className="font-mono text-2xl font-bold text-foreground">$14.9M</p>
              <p className="text-xs text-muted-foreground">Escrow TVL</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-card/30 p-4 backdrop-blur-sm">
              <p className="font-mono text-2xl font-bold text-foreground">1,284</p>
              <p className="text-xs text-muted-foreground">Active RFQs</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-card/30 p-4 backdrop-blur-sm">
              <p className="font-mono text-2xl font-bold text-foreground">21.4h</p>
              <p className="text-xs text-muted-foreground">Avg Lock Time</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-border/50 bg-card/20 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">How It Works</h2>
            <p className="mt-4 text-muted-foreground">Three steps to verified procurement with on-chain settlement.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: 1,
                title: "Connect Wallet",
                description: "Link your wallet to verify your identity and access the marketplace.",
                icon: Lock,
              },
              {
                step: 2,
                title: "Browse & Order",
                description: "Discover verified vendors, compare pricing tiers, and negotiate terms.",
                icon: Zap,
              },
              {
                step: 3,
                title: "Escrow Releases",
                description: "Funds held in verified smart contracts. Automatic settlement on fulfillment.",
                icon: CheckCircle,
              },
            ].map((item, idx) => (
              <div key={idx} className="group relative">
                <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 opacity-0 blur transition-opacity group-hover:opacity-100" />
                <div className="relative space-y-4 rounded-lg border border-border/50 bg-background p-6 backdrop-blur-sm transition-all group-hover:border-primary/50 group-hover:bg-card/50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                      <span className="font-semibold text-primary">{item.step}</span>
                    </div>
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Enterprise Features</h2>
            <p className="mt-4 text-muted-foreground">Built for scale, security, and trust.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Shield,
                title: "On-Chain Escrow",
                description: "Verified smart contract settlement. Zero counterparty risk.",
              },
              {
                icon: TrendingUp,
                title: "Logistics Hedging",
                description: "Hedge delivery delays and customs risks with prediction markets.",
              },
              {
                icon: Lock,
                title: "Verified Vendors",
                description: "All sellers audited on-chain. Cryptographic proof of performance.",
              },
              {
                icon: Zap,
                title: "Instant Settlement",
                description: "Solana-speed transaction finality. No delayed clearance.",
              },
              {
                icon: CheckCircle,
                title: "Graphite Ledger",
                description: "Enterprise-grade audit trail. Every transaction immutable.",
              },
              {
                icon: ArrowRight,
                title: "API Integration",
                description: "RESTful APIs for ERP systems. Webhook notifications.",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="group rounded-lg border border-border/50 bg-card/30 p-6 transition-all hover:border-primary/50 hover:bg-card/60 backdrop-blur-sm"
              >
                <feature.icon className="h-6 w-6 text-primary transition-transform group-hover:scale-110" />
                <h3 className="mt-4 font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative border-t border-border/50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Ready to start trading?</h2>
          <p className="mt-4 text-muted-foreground">Join enterprise buyers and sellers on the most secure B2B marketplace.</p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/onboarding"
              className="group inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3 font-semibold text-primary-foreground transition-all hover:shadow-lg hover:shadow-primary/20"
            >
              Get Started Now
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card/50 px-8 py-3 font-semibold text-foreground transition-all hover:border-primary hover:bg-card backdrop-blur-sm"
            >
              View Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/30 px-4 py-8 sm:px-6 lg:px-8 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-cyan-500/80 to-blue-600/80 blur-sm" />
            <span className="font-semibold tracking-tight text-foreground">AETHER-LOGOS</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">
              Docs
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              API
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Support
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Terms
            </a>
          </div>
        </div>
        <div className="mt-8 border-t border-border/50 pt-8 text-center text-xs text-muted-foreground">
          <p>© 2026 AETHER-LOGOS. Built on Solana. Enterprise logistics settled on-chain.</p>
        </div>
      </footer>
    </div>
  );
}
