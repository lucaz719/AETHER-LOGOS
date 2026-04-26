'use client';

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useVendorProfile } from "@/hooks/useVendorProfile";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const { publicKey } = useWallet();
  const { profile, loading } = useVendorProfile(publicKey?.toBase58());
  const router = useRouter();

  const [path, setPath] = useState<"none" | "buyer" | "vendor">("none");
  const [step, setStep] = useState(1);

  // Auto-forward if wallet connects and they have a vendor profile
  useEffect(() => {
    if (publicKey && profile && !loading) {
      router.push("/vendor/dashboard");
    }
  }, [publicKey, profile, loading, router]);

  // Step 1: Connect Wallet (handled implicitly by rendering if !publicKey)

  if (!publicKey) {
    return (
      <main className="page-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
        <div className="glass" style={{ textAlign: "center", padding: "4rem", maxWidth: 600 }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>👋</div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
            Welcome to AETHER-LOGOS
          </h1>
          <p style={{ color: "var(--text-secondary)", marginBottom: "2rem", fontSize: "1.1rem" }}>
            The secure, escrow-backed marketplace for global trade on Solana.
          </p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <WalletMultiButton />
          </div>
          <p style={{ marginTop: "1.5rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Connect your wallet to get started.
          </p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="page-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
        <div style={{ color: "var(--text-muted)" }}>Loading your profile...</div>
      </main>
    );
  }

  // Step 2: Choose Path
  if (path === "none") {
    return (
      <main className="page-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
        <div className="glass" style={{ textAlign: "center", padding: "3rem", maxWidth: 700 }}>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "1rem" }}>
            How will you use the marketplace?
          </h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "2.5rem" }}>
            Select your primary role. You can always change this later.
          </p>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem" }}>
            <button 
              onClick={() => { setPath("buyer"); setStep(1); }}
              className="glass" 
              style={{ padding: "2rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", cursor: "pointer", transition: "all var(--transition)", border: "1px solid var(--border)", background: "var(--bg-surface)" }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = "var(--cyan)"}
              onMouseOut={(e) => e.currentTarget.style.borderColor = "var(--border)"}
            >
              <div style={{ fontSize: "3rem" }}>🛍️</div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>I want to Buy</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>Browse products, place orders, and pay securely using escrow.</p>
            </button>
            
            <button 
              onClick={() => { setPath("vendor"); setStep(1); }}
              className="glass" 
              style={{ padding: "2rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", cursor: "pointer", transition: "all var(--transition)", border: "1px solid var(--border)", background: "var(--bg-surface)" }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = "var(--purple)"}
              onMouseOut={(e) => e.currentTarget.style.borderColor = "var(--border)"}
            >
              <div style={{ fontSize: "3rem" }}>🏪</div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>I want to Sell</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>Register a shop, list products, and fulfill global orders.</p>
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Buyer Path
  if (path === "buyer") {
    return (
      <main className="page-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
        <div className="glass" style={{ padding: "3rem", maxWidth: 600, width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {step === 1 ? "Secure Escrow" : "Ready to Browse"}
            </h2>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Step {step} of 2</div>
          </div>
          
          {step === 1 && (
            <div>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--cyan-dim)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", color: "var(--cyan)" }}>💰</div>
                  <div style={{ color: "var(--text-muted)" }}>→</div>
                  <div style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--purple-dim)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", color: "var(--purple)" }}>🔒</div>
                  <div style={{ color: "var(--text-muted)" }}>→</div>
                  <div style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--green-dim)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", color: "var(--green)" }}>📦</div>
                </div>
              </div>
              <p style={{ color: "var(--text-secondary)", marginBottom: "1rem", lineHeight: 1.6 }}>
                Every purchase on AETHER-LOGOS is protected by smart contract escrow.
              </p>
              <ul style={{ color: "var(--text-muted)", fontSize: "0.9rem", display: "grid", gap: "0.75rem", paddingLeft: "1.2rem", marginBottom: "2.5rem" }}>
                <li>Your funds are locked safely when you place an order.</li>
                <li>The vendor ships the goods and provides tracking.</li>
                <li>Funds are only released once delivery is verified.</li>
              </ul>
              <button onClick={() => setStep(2)} className="btn-primary" style={{ width: "100%", padding: "0.75rem" }}>
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🎉</div>
              <p style={{ color: "var(--text-secondary)", marginBottom: "2.5rem", lineHeight: 1.6 }}>
                You're all set! Explore thousands of products from verified vendors globally.
              </p>
              <Link href="/marketplace" className="btn-primary" style={{ display: "block", textDecoration: "none", padding: "0.75rem" }}>
                Browse Marketplace →
              </Link>
            </div>
          )}
        </div>
      </main>
    );
  }

  // Vendor Path
  if (path === "vendor") {
    return (
      <main className="page-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
        <div className="glass" style={{ padding: "3rem", maxWidth: 600, width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {step === 1 ? "Set Up Your Shop" : "Zero Counterparty Risk"}
            </h2>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Step {step} of 2</div>
          </div>
          
          {step === 1 && (
            <div>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem", fontSize: "3rem" }}>
                🏗️
              </div>
              <p style={{ color: "var(--text-secondary)", marginBottom: "1rem", lineHeight: 1.6 }}>
                To start selling, you'll need to register your vendor profile on-chain.
              </p>
              <ul style={{ color: "var(--text-muted)", fontSize: "0.9rem", display: "grid", gap: "0.75rem", paddingLeft: "1.2rem", marginBottom: "2.5rem" }}>
                <li>Add your shop details, logo, and categories.</li>
                <li>Gain a verified badge after admin review.</li>
                <li>Reach a global audience with instant crypto settlements.</li>
              </ul>
              <button onClick={() => setStep(2)} className="btn-primary" style={{ width: "100%", padding: "0.75rem" }}>
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--purple-dim)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", color: "var(--purple)" }}>🔒</div>
                  <div style={{ color: "var(--text-muted)" }}>→</div>
                  <div style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--cyan-dim)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", color: "var(--cyan)" }}>🚚</div>
                  <div style={{ color: "var(--text-muted)" }}>→</div>
                  <div style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--green-dim)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", color: "var(--green)" }}>💵</div>
                </div>
              </div>
              <p style={{ color: "var(--text-secondary)", marginBottom: "2.5rem", lineHeight: 1.6 }}>
                When a buyer orders, their payment is secured in an on-chain escrow vault. Once the order is delivered, you get paid automatically. No chargebacks, no delays.
              </p>
              <Link href="/vendor/register" className="btn-primary" style={{ display: "block", textAlign: "center", textDecoration: "none", padding: "0.75rem" }}>
                Register Shop Profile →
              </Link>
            </div>
          )}
        </div>
      </main>
    );
  }

  return null;
}
