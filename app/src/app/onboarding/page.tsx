'use client';

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useVendorProfile } from "@/hooks/useVendorProfile";
import { useOnboardingStore } from "@/lib/stores/onboardingStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, Store, Lock, Package, TrendingUp, Zap } from "lucide-react";

const API = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8080";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function OnboardingPage() {
  const { publicKey } = useWallet();
  const { profile, loading } = useVendorProfile(publicKey?.toBase58());
  const router = useRouter();

  // Use Zustand store for persistence
  const path = useOnboardingStore((state) => state.userRole);
  const setPath = useOnboardingStore((state) => state.setUserRole);
  const sellerTier = useOnboardingStore((state) => state.sellerTier);
  const setSellerTier = useOnboardingStore((state) => state.setSellerTier);
  const currentStep = useOnboardingStore((state) => state.currentStep);
  const setCurrentStep = useOnboardingStore((state) => state.setCurrentStep);
  const markOnboardingComplete = useOnboardingStore((state) => state.markOnboardingComplete);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    businessName: "",
    industry: "",
    shopName: "",
    categories: "",
    tierData: {} as Record<string, string>,
  });

  const completeVendorSetup = async () => {
    if (!publicKey || !sellerTier) return;
    if (!formData.shopName.trim()) {
      setSubmitError("Shop name is required.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const slug = slugify(formData.shopName);
      if (!slug) {
        setSubmitError("Shop name must include letters or numbers.");
        return;
      }

      const response = await fetch(`${API}/api/stores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_wallet: publicKey.toBase58(),
          slug,
          store_name: formData.shopName.trim(),
          description: "",
          store_type: sellerTier,
          categories: formData.categories.trim(),
        }),
      });

      if (!response.ok && response.status !== 409) {
        throw new Error(await response.text());
      }

      // Mark onboarding complete in store
      markOnboardingComplete();
      router.push("/vendor/dashboard");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create store.");
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-forward if wallet connects and they have a vendor profile
  useEffect(() => {
    if (publicKey && profile && !loading) {
      markOnboardingComplete();
      router.push("/vendor/dashboard");
    }
  }, [publicKey, profile, loading, router, markOnboardingComplete]);

  // Auto-redirect if already onboarded
  useEffect(() => {
    if (publicKey && path === null) {
      // If path is null and wallet is connected, check if we should redirect
      // This handles the case where user was already onboarded in a previous session
      // The useVendorProfile hook will determine if they're a vendor
      if (profile && !loading) {
        markOnboardingComplete();
        router.push("/vendor/dashboard");
      }
    }
  }, [publicKey, loading]);

  if (!publicKey) {
    return (
      <main className="page-container flex items-center justify-center min-h-[80vh]">
        <div className="glass rounded-lg border border-border bg-card p-16 text-center max-w-2xl shadow-sm">
          <div className="mb-4 flex justify-center">
            <Zap className="h-12 w-12 text-primary" />
          </div>
          <h1 className="mb-2 text-4xl font-bold text-foreground">
            Welcome to AETHER-LOGOS
          </h1>
          <p className="mb-8 text-lg text-muted-foreground">
            The secure, escrow-backed marketplace for global trade on Solana.
          </p>
          <div className="flex justify-center">
            <WalletMultiButton />
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Connect your wallet to get started.
          </p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="page-container flex items-center justify-center min-h-[80vh]">
        <div className="text-muted-foreground">Loading your profile...</div>
      </main>
    );
  }

  // Step 1: Choose Path
  if (path === null) {
    return (
      <main className="page-container flex items-center justify-center min-h-[80vh]">
        <div className="glass rounded-lg border border-border bg-card p-12 text-center max-w-4xl shadow-sm">
          <h2 className="mb-4 text-3xl font-bold text-foreground">
            How will you use AETHER-LOGOS?
          </h2>
          <p className="mb-12 text-muted-foreground">
            Select your primary role. You can always change this later.
          </p>
          
          <div className="grid gap-6 md:grid-cols-2">
            <button 
              onClick={() => { setPath("buyer"); setCurrentStep(1); }}
              className="rounded-lg border border-border bg-background p-8 text-left transition-colors hover:border-primary hover:bg-muted"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <ShoppingCart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-foreground">I want to Buy</h3>
              <p className="text-sm text-muted-foreground">
                Browse products, place orders, and pay securely using escrow.
              </p>
            </button>
            
            <button 
              onClick={() => { setPath("seller"); setCurrentStep(1); }}
              className="rounded-lg border border-border bg-background p-8 text-left transition-colors hover:border-primary hover:bg-muted"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Store className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-foreground">I want to Sell</h3>
              <p className="text-sm text-muted-foreground">
                Register a shop, list products, and fulfill global orders.
              </p>
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Buyer Path
  if (path === "buyer") {
    return (
      <main className="page-container flex items-center justify-center min-h-[80vh]">
        <div className="glass rounded-lg border border-border bg-card p-12 max-w-2xl w-full shadow-sm">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">
              {currentStep === 1 ? "Secure Escrow Explained" : "Ready to Browse"}
            </h2>
            <div className="text-sm text-muted-foreground">Step {currentStep} of 2</div>
          </div>
          
          {currentStep === 1 && (
            <div>
              <div className="mb-8 flex items-center justify-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <div className="text-muted-foreground">→</div>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Lock className="h-8 w-8 text-primary" />
                </div>
                <div className="text-muted-foreground">→</div>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Package className="h-8 w-8 text-primary" />
                </div>
              </div>
              <p className="mb-4 text-muted-foreground">
                Every purchase on AETHER-LOGOS is protected by smart contract escrow.
              </p>
              <ul className="mb-8 space-y-2 border-l-2 border-border pl-4 text-sm text-muted-foreground">
                <li>Your funds are locked safely when you place an order.</li>
                <li>The vendor ships the goods and provides tracking.</li>
                <li>Funds are only released once delivery is verified.</li>
              </ul>
              <button 
                onClick={() => setCurrentStep(2)} 
                className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-95"
              >
                Continue
              </button>
            </div>
          )}

          {currentStep === 2 && (
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <ShoppingCart className="h-8 w-8 text-primary" />
                </div>
              </div>
              <p className="mb-8 text-muted-foreground">
                You're all set! Explore thousands of products from verified vendors globally.
              </p>
              <button
                onClick={() => {
                  markOnboardingComplete();
                  router.push("/stores");
                }}
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-95"
              >
                Browse Marketplace →
              </button>
            </div>
          )}
        </div>
      </main>
    );
  }

  // Vendor Path
  if (path === "seller") {
    // Step 1: Seller Tier Selection
    if (currentStep === 1 && !sellerTier) {
      return (
        <main className="page-container flex items-center justify-center min-h-[80vh]">
          <div className="glass rounded-lg border border-border bg-card p-12 max-w-3xl w-full shadow-sm">
            <h2 className="mb-4 text-2xl font-bold text-foreground">Choose Your Seller Tier</h2>
            <p className="mb-8 text-muted-foreground">
              Select the tier that best describes your business. Each tier offers different MOQ and lead time defaults.
            </p>

            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  id: "distributor",
                  title: "Certified Distributor",
                  description: "Fast local shipping, lower MOQs. Best for regional stockists.",
                  features: ["Lower MOQ", "Faster delivery", "Regional focus"],
                },
                {
                  id: "wholesaler",
                  title: "Verified Wholesaler",
                  description: "Bulk B2B trading with moderate lead times.",
                  features: ["Moderate MOQ", "Standard lead time", "Bulk specialist"],
                },
                {
                  id: "manufacturer",
                  title: "Direct Manufacturer",
                  description: "Direct source with custom lead times. Highest trust.",
                  features: ["Higher MOQ", "Custom lead times", "Lowest price"],
                },
              ].map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => {
                    setSellerTier(tier.id as any);
                    setCurrentStep(2);
                  }}
                  className="rounded-lg border-2 border-border bg-background p-6 text-left transition-all hover:border-primary hover:bg-muted"
                >
                  <h3 className="mb-2 text-lg font-bold text-foreground">{tier.title}</h3>
                  <p className="mb-4 text-sm text-muted-foreground">{tier.description}</p>
                  <ul className="space-y-1">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="h-1 w-1 rounded-full bg-primary"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          </div>
        </main>
      );
    }

    // Step 2+: Tier-Specific Form
    return (
      <main className="page-container flex items-center justify-center min-h-[80vh]">
        <div className="glass rounded-lg border border-border bg-card p-12 max-w-2xl w-full shadow-sm">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">Complete Your Profile</h2>
            <div className="text-sm text-muted-foreground">Step {currentStep} of 3</div>
          </div>

          <form className="space-y-6">
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Shop Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Global Tech Supplies"
                    value={formData.shopName}
                    onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-4 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Product Categories</label>
                  <input
                    type="text"
                    placeholder="e.g., Electronics, Industrial"
                    value={formData.categories}
                    onChange={(e) => setFormData({ ...formData, categories: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-4 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            )}

            {currentStep === 3 && sellerTier === "distributor" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Distribution Region</label>
                  <input
                    type="text"
                    placeholder="e.g., Southeast Asia, North America"
                    value={formData.tierData.region || ""}
                    onChange={(e) => setFormData({ ...formData, tierData: { ...formData.tierData, region: e.target.value } })}
                    className="w-full rounded-md border border-border bg-background px-4 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            )}

            {currentStep === 3 && sellerTier === "wholesaler" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Bulk Capacity (units/month)</label>
                  <input
                    type="number"
                    placeholder="e.g., 50000"
                    value={formData.tierData.capacity || ""}
                    onChange={(e) => setFormData({ ...formData, tierData: { ...formData.tierData, capacity: e.target.value } })}
                    className="w-full rounded-md border border-border bg-background px-4 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            )}

            {currentStep === 3 && sellerTier === "manufacturer" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Factory Location</label>
                  <input
                    type="text"
                    placeholder="e.g., Shanghai, China"
                    value={formData.tierData.location || ""}
                    onChange={(e) => setFormData({ ...formData, tierData: { ...formData.tierData, location: e.target.value } })}
                    className="w-full rounded-md border border-border bg-background px-4 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  if (currentStep > 2) setCurrentStep(currentStep - 1);
                  else setSellerTier(null);
                }}
                className="inline-flex h-10 flex-1 items-center justify-center rounded-md border border-border bg-background text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (currentStep < 3) {
                    setCurrentStep(currentStep + 1);
                    return;
                  }
                  void completeVendorSetup();
                }}
                className="inline-flex h-10 flex-1 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:opacity-95"
                disabled={submitting}
              >
                {currentStep === 3 ? (submitting ? "Creating Store..." : "Complete Setup") : "Continue"}
              </button>
            </div>
            {submitError && (
              <p className="text-sm text-red-600">{submitError}</p>
            )}
          </form>
        </div>
      </main>
    );
  }

  return null;
}
