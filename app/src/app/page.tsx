"use client";

import { ArrowRight, CheckCircle, Globe, Lock, Package, Shield, TrendingUp, Zap } from "lucide-react";
import { Cormorant_Garamond, Inter, JetBrains_Mono } from "next/font/google";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useOnboardingStore } from "@/lib/stores/onboardingStore";

const EarthHero = dynamic(() => import("../components/EarthHero"), { ssr: false });

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400"], display: "swap" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500"], display: "swap" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], display: "swap" });

/* ═══════════════════════════ HEADER ═══════════════════════════ */

function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { onboardingCompleted, userRole } = useOnboardingStore();

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLaunch = () => {
    if (!onboardingCompleted) return router.push("/onboarding");
    if (userRole === "seller") return router.push("/vendor/dashboard");
    return router.push("/stores");
  };

  if (!mounted) return null;

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 transition-colors duration-300 ${inter.className} ${scrolled ? "bg-[#0d0d14]/90 backdrop-blur-md" : "bg-transparent"}`}
      style={scrolled ? { borderBottom: "0.5px solid rgba(255,255,255,0.08)" } : undefined}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-base font-medium tracking-tight text-white">
          ◯ AETHER-LOGOS
        </Link>
        <div className="flex items-center gap-8">
          <div className="hidden items-center gap-6 sm:flex">
            <a href="#how-it-works" className="text-[13px] text-[#a0a0b0] transition-colors duration-150 hover:text-white">How It Works</a>
            <a href="#features" className="text-[13px] text-[#a0a0b0] transition-colors duration-150 hover:text-white">Features</a>
            <a href="#hedge" className="text-[13px] text-[#a0a0b0] transition-colors duration-150 hover:text-white">Risk Markets</a>
          </div>
          <button
            onClick={handleLaunch}
            className="inline-flex items-center gap-2 border px-4 py-2 text-[13px] text-white transition-all duration-200 hover:bg-white hover:text-[#0d0d14]"
            style={{ borderWidth: "0.5px", borderColor: "rgba(255,255,255,0.3)" }}
          >
            Launch App
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </nav>
    </header>
  );
}

/* ═══════════════════════════ LANDING PAGE ═══════════════════════════ */

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { onboardingCompleted, userRole } = useOnboardingStore();

  const heroStats = [
    { value: "$14.9M", label: "Escrow TVL" },
    { value: "1,284",  label: "Active RFQs" },
    { value: "21.4h",  label: "Avg Settlement" },
  ];

  const howItWorks = [
    { step: "01", icon: Lock,        title: "Connect & Browse",                  description: "Link your Solana wallet and explore products from Direct Manufacturers, Verified Wholesalers, and Certified Distributors — each audited on-chain." },
    { step: "02", icon: Package,     title: "Place Order in Escrow",             description: "USDC is locked in a verified smart contract the moment you confirm. The vendor ships, tracking begins, and your funds stay safe until delivery." },
    { step: "03", icon: CheckCircle, title: "Delivery Verified, Funds Released", description: "Our oracle monitors shipment status. On confirmed delivery, escrow auto-releases to the seller. Dispute at any point — funds stay locked until resolved." },
  ];

  const features = [
    { icon: Shield,      title: "On-Chain Escrow",         description: "Smart contract holds funds until delivery is cryptographically verified. Zero counterparty risk." },
    { icon: Globe,       title: "Tiered Vendor Network",   description: "Direct Manufacturers, Verified Wholesalers, and Certified Distributors — each tier with on-chain credentials." },
    { icon: Zap,         title: "Solana-Speed Settlement",  description: "Sub-second transaction finality. No delayed clearance, no banking hours, no borders." },
    { icon: Package,     title: "Live Shipment Tracking",   description: "DHL oracle integration streams tracking status directly into your escrow contract." },
    { icon: Lock,        title: "Dispute Resolution",       description: "Open a dispute at any stage. Funds stay locked until arbitration resolves — never at risk." },
    { icon: CheckCircle, title: "Graphite Ledger Audit",    description: "Immutable on-chain record of every order, shipment event, and payment. Enterprise-grade compliance." },
  ];

  const markets = [
    { event: "DHL Customs Hold",  prob: 64, side: "YES" as const },
    { event: "Delivery SLA Miss", prob: 42, side: "NO"  as const },
    { event: "Transit Exception",  prob: 34, side: "YES" as const },
  ];

  useEffect(() => { setMounted(true); }, []);

  const handleLaunch = () => {
    if (!onboardingCompleted) return router.push("/onboarding");
    if (userRole === "seller") return router.push("/vendor/dashboard");
    return router.push("/stores");
  };

  if (!mounted) return null;

  /* section background — slightly transparent so Earth peeks through on the right edge */
  const sectionBg = "rgba(13,13,20,0.92)";

  return (
    <div className="bg-[#0a0a0a] text-white">
      {/* ── Fixed Earth canvas behind everything ── */}
      <EarthHero />

      <LandingHeader />

      {/* ════════════════ HERO ════════════════ */}
      <section className="relative z-10 flex min-h-screen items-center" style={{ background: "transparent" }}>
        <div
          className="ml-0 w-full max-w-[50%] px-16 py-24"
          style={{
            background: "linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 70%, transparent 100%)",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div className={`${jetbrainsMono.className} mb-8 inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-[#a0a0b0]`}>
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#61ff83]" />
            Enterprise-Grade B2B Procurement on Solana
          </div>

          <h1
            className={`${cormorant.className} mb-6 text-white`}
            style={{ fontSize: "clamp(48px, 7vw, 96px)", letterSpacing: "-0.02em", lineHeight: 1.03, fontWeight: 300 }}
          >
            The Secure Escrow Marketplace for Global Trade
          </h1>

          <p className={`${inter.className} max-w-[520px] text-[16px] leading-[1.7] text-[#a0a0b0]`}>
            Buy and sell industrial goods with confidence. Every order is protected by smart contract escrow — funds only release when delivery is verified on-chain.
          </p>

          <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <button
              onClick={handleLaunch}
              id="hero-get-started"
              className={`${inter.className} inline-flex items-center justify-center gap-2 rounded-none bg-white px-8 py-3 text-sm font-medium text-[#0d0d14] transition-transform duration-200 hover:scale-[1.02]`}
            >
              Start Trading
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={handleLaunch}
              id="hero-browse-marketplace"
              className={`${inter.className} inline-flex items-center justify-center gap-2 rounded-none border px-8 py-3 text-sm font-medium text-white transition-colors duration-200 hover:border-white`}
              style={{ borderWidth: "0.5px", borderColor: "rgba(255,255,255,0.4)" }}
            >
              Browse Marketplace
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3">
            {heroStats.map((stat, index) => (
              <div
                key={stat.label}
                className={`py-4 text-left ${index > 0 ? "sm:border-l sm:pl-6" : "sm:pr-6"}`}
                style={index > 0 ? { borderLeftWidth: "0.5px", borderLeftColor: "rgba(255,255,255,0.2)" } : undefined}
              >
                <p className={`${cormorant.className} text-[36px] leading-none text-white`} style={{ fontWeight: 300 }}>{stat.value}</p>
                <p className={`${jetbrainsMono.className} mt-2 text-[10px] uppercase tracking-[0.15em] text-[#666680]`}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ HOW IT WORKS ════════════════ */}
      <section id="how-it-works" className="relative z-10 px-6 py-24 lg:px-8" style={{ background: sectionBg }}>
        <div className="mx-auto max-w-7xl">
          <p className={`${jetbrainsMono.className} mb-4 text-[11px] uppercase tracking-[0.2em] text-[#666680]`}>How it works</p>
          <h2 className={`${cormorant.className} max-w-3xl text-left text-white`} style={{ fontSize: "clamp(42px, 5vw, 52px)", fontWeight: 300 }}>
            Procurement protected at every step
          </h2>
          <p className={`${inter.className} mt-5 max-w-2xl text-left text-[16px] leading-[1.7] text-[#a0a0b0]`}>
            Three steps from order to verified delivery — fully on-chain, no middlemen, no trust required.
          </p>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {howItWorks.map((item) => (
              <div
                key={item.step}
                className="border bg-[#111116]/80 p-7 text-left transition-all duration-300 hover:border-white/12"
                style={{ borderWidth: "0.5px", borderColor: "rgba(255,255,255,0.06)" }}
              >
                <p className={`${jetbrainsMono.className} mb-5 text-[11px] tracking-[0.15em] text-[#666680]`}>{item.step}</p>
                <item.icon className="mb-5 h-5 w-5 text-white/60" />
                <h3 className={`${inter.className} mb-3 text-lg font-medium text-white`}>{item.title}</h3>
                <p className={`${inter.className} text-sm leading-[1.7] text-[#a0a0b0]`}>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ FEATURES ════════════════ */}
      <section id="features" className="relative z-10 px-6 py-24 lg:px-8" style={{ background: sectionBg }}>
        <div className="mx-auto max-w-7xl">
          <p className={`${jetbrainsMono.className} mb-4 text-[11px] uppercase tracking-[0.2em] text-[#666680]`}>Platform features</p>
          <h2 className={`${cormorant.className} max-w-3xl text-left text-white`} style={{ fontSize: "clamp(42px, 5vw, 52px)", fontWeight: 300 }}>
            Built for enterprise trust
          </h2>

          <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="border bg-[#111116]/80 p-6 text-left transition-all duration-300 hover:border-white/12"
                style={{ borderWidth: "0.5px", borderColor: "rgba(255,255,255,0.06)" }}
              >
                <feature.icon className="mb-5 h-5 w-5 text-white/60" />
                <h3 className={`${inter.className} mb-2 text-base font-medium text-white`}>{feature.title}</h3>
                <p className={`${inter.className} text-[14px] leading-[1.7] text-[#a0a0b0]`}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ HEDGE MARKETS ════════════════ */}
      <section id="hedge" className="relative z-10 px-6 py-24 lg:px-8" style={{ background: sectionBg }}>
        <div className="mx-auto max-w-7xl">
          <div className={`${jetbrainsMono.className} mb-4 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[#666680]`}>
            <TrendingUp className="h-3.5 w-3.5 text-white/60" />
            Something More
          </div>
          <h2 className={`${cormorant.className} max-w-4xl text-left text-white`} style={{ fontSize: "clamp(46px, 6vw, 72px)", fontWeight: 300 }}>
            Didn&apos;t know you could hedge logistics risk.
          </h2>
          <p className={`${inter.className} mt-6 max-w-2xl text-left text-[16px] leading-[1.7] text-[#a0a0b0]`}>
            Trade prediction markets on delivery outcomes — customs delays, SLA breaches, transit exceptions. Your supply chain risk, quantified and traded.
          </p>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {markets.map((market) => (
              <div
                key={market.event}
                className="border bg-[#111116]/80 p-6 text-left transition-all duration-300 hover:border-white/12"
                style={{ borderWidth: "0.5px", borderColor: "rgba(255,255,255,0.06)" }}
              >
                <p className={`${jetbrainsMono.className} mb-4 text-[11px] uppercase tracking-[0.15em] text-[#666680]`}>{market.event}</p>
                <div className="mb-4 h-1.5 w-full bg-white/10">
                  <div
                    className="h-full transition-all duration-1000"
                    style={{ width: `${market.prob}%`, backgroundColor: market.side === "YES" ? "#ffffff" : "#666680" }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className={`${jetbrainsMono.className} text-xs tracking-[0.12em] ${market.side === "YES" ? "text-white" : "text-[#666680]"}`}>
                    {market.side}
                  </span>
                  <span className={`${jetbrainsMono.className} text-lg text-white`}>{market.prob}%</span>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleLaunch}
            id="markets-explore"
            className={`${inter.className} mt-10 inline-flex items-center justify-center gap-2 border px-8 py-3 text-sm font-medium text-white transition-colors duration-200 hover:border-white`}
            style={{ borderWidth: "0.5px", borderColor: "rgba(255,255,255,0.4)" }}
          >
            Explore Risk Markets
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ════════════════ FINAL CTA ════════════════ */}
      <section className="relative z-10 px-6 py-24 lg:px-8" style={{ background: sectionBg }}>
        <div className="mx-auto max-w-4xl text-center">
          <h2 className={`${cormorant.className} text-white`} style={{ fontSize: "clamp(44px, 6vw, 64px)", fontWeight: 300 }}>
            Ready to trade with confidence?
          </h2>
          <p className={`${inter.className} mx-auto mt-5 max-w-2xl text-[16px] leading-[1.7] text-[#a0a0b0]`}>
            Join enterprise buyers and verified vendors on the only marketplace where escrow is the default.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={handleLaunch}
              id="final-cta-start"
              className={`${inter.className} inline-flex items-center justify-center gap-2 rounded-none bg-white px-8 py-3 text-sm font-medium text-[#0d0d14] transition-transform duration-200 hover:scale-[1.02]`}
            >
              Start Trading
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={handleLaunch}
              id="final-cta-browse"
              className={`${inter.className} inline-flex items-center justify-center gap-2 rounded-none border px-8 py-3 text-sm font-medium text-white transition-colors duration-200 hover:border-white`}
              style={{ borderWidth: "0.5px", borderColor: "rgba(255,255,255,0.4)" }}
            >
              Browse Marketplace
            </button>
          </div>
        </div>
      </section>

      {/* ════════════════ FOOTER ════════════════ */}
      <footer
        className="relative z-10 px-6 py-12 lg:px-8"
        style={{ background: sectionBg, borderTop: "0.5px solid rgba(255,255,255,0.08)" }}
      >
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-3 md:items-center">
          <div className={`${inter.className} text-left`}>
            <p className="text-base font-medium text-white">◯ AETHER-LOGOS</p>
            <p className="mt-2 text-[13px] text-[#666680]">© 2026 AETHER-LOGOS. All rights reserved.</p>
          </div>
          <div className={`${inter.className} flex justify-start gap-6 text-[13px] text-[#666680] md:justify-center`}>
            {["Docs", "API", "Support", "Terms"].map((item) => (
              <a key={item} href="#" className="transition-colors duration-150 hover:text-white">{item}</a>
            ))}
          </div>
          <div className={`${inter.className} flex justify-start gap-6 text-[13px] text-[#666680] md:justify-end`}>
            {["X", "LinkedIn", "Status"].map((item) => (
              <a key={item} href="#" className="transition-colors duration-150 hover:text-white">{item}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
