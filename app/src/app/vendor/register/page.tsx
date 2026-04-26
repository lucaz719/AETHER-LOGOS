'use client';

import { useCallback, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { useAnchorClient } from "@/hooks/useAnchorClient";
import { MARKETPLACE_PROGRAM_ID } from "@/lib/anchor";
import { VendorDashboardNav } from "@/components/VendorDashboardNav";
import Link from "next/link";

const VENDOR_TYPES = ["Retailer", "Wholesaler", "Distributor", "Manufacturer"] as const;
const ALL_CATEGORIES = ["Electronics", "Apparel", "HomeGoods", "Machinery", "FoodBeverage", "Chemicals", "Automotive", "Healthcare", "Construction", "Other"];

async function sha256Hex(text: string): Promise<Uint8Array> {
  const encoded = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", encoded as any);
  return new Uint8Array(buf);
}

export default function VendorRegisterPage() {
  const { publicKey } = useWallet();
  const { marketplaceProgram } = useAnchorClient();
  const [shopName, setShopName] = useState("");
  const [shopDesc, setShopDesc] = useState("");
  const [vendorType, setVendorType] = useState<string>("Retailer");
  const [categories, setCategories] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const toggleCategory = useCallback((cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : prev.length < 8 ? [...prev, cat] : prev,
    );
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!marketplaceProgram || !publicKey) return;
      setSubmitting(true);
      setError(null);
      try {
        const emailHash = await sha256Hex(email.trim().toLowerCase());
        const [vendorProfilePda] = PublicKey.findProgramAddressSync(
          [Buffer.from("vendor"), publicKey.toBuffer()],
          MARKETPLACE_PROGRAM_ID,
        );
        const vtObj: Record<string, Record<string, never>> = {};
        vtObj[vendorType.charAt(0).toLowerCase() + vendorType.slice(1)] = {};

        await (marketplaceProgram.methods as any)
          .registerVendor(shopName, shopDesc, vtObj, categories, Array.from(emailHash))
          .accounts({
            authority: publicKey,
            vendorProfile: vendorProfilePda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        setDone(true);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setSubmitting(false);
      }
    },
    [marketplaceProgram, publicKey, shopName, shopDesc, vendorType, categories, email],
  );

  if (!publicKey) {
    return (
      <main className="page-container" style={{ textAlign: "center", paddingTop: "4rem", maxWidth: 600 }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏪</div>
        <h2 style={{ color: "var(--text-primary)", marginBottom: "0.5rem" }}>Register as Vendor</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>Connect your wallet to create a vendor shop.</p>
        <WalletMultiButton />
      </main>
    );
  }

  return (
    <main className="page-container" style={{ display: "flex", gap: "2rem" }}>
      <VendorDashboardNav active="/vendor/register" />
      <div style={{ flex: 1 }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "1.75rem" }}>
          Shop Profile
        </h1>
        {done ? (
          <div className="glass" style={{ textAlign: "center", padding: "3rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
            <h2 style={{ color: "var(--green)", marginBottom: "0.5rem" }}>Vendor registered successfully!</h2>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "1.25rem" }}>
              <Link href="/vendor/dashboard" className="btn-primary" style={{ textDecoration: "none" }}>
                Go to Dashboard →
              </Link>
              <Link href="/vendor/listings/new" className="btn-ghost" style={{ textDecoration: "none" }}>
                Create First Listing
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1.25rem", maxWidth: 560 }}>
            <div style={{ display: "grid", gap: "0.35rem" }}>
              <label style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)" }}>Shop Name *</label>
              <input
                required
                maxLength={64}
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="input"
                placeholder="e.g. TechParts Global"
              />
            </div>

            <div style={{ display: "grid", gap: "0.35rem" }}>
              <label style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)" }}>Shop Description *</label>
              <textarea
                required
                maxLength={256}
                value={shopDesc}
                onChange={(e) => setShopDesc(e.target.value)}
                rows={3}
                className="input"
                style={{ resize: "vertical" }}
                placeholder="Describe your business…"
              />
            </div>

            <div style={{ display: "grid", gap: "0.35rem" }}>
              <label style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)" }}>Vendor Type *</label>
              <select value={vendorType} onChange={(e) => setVendorType(e.target.value)} className="input">
                {VENDOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div style={{ display: "grid", gap: "0.5rem" }}>
              <label style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Categories <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(max 8)</span>
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {ALL_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    style={{
                      padding: "0.3rem 0.75rem",
                      borderRadius: "var(--radius-pill)",
                      border: categories.includes(cat) ? "1px solid var(--cyan)" : "1px solid var(--border)",
                      background: categories.includes(cat) ? "var(--cyan-dim)" : "transparent",
                      color: categories.includes(cat) ? "var(--cyan)" : "var(--text-secondary)",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      transition: "all var(--transition)",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gap: "0.35rem" }}>
              <label style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Contact Email <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(hashed on-chain)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
              />
              <small style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>Only a SHA-256 hash is stored on-chain.</small>
            </div>

            {error && (
              <div
                style={{
                  background: "rgba(244,63,94,0.08)",
                  border: "1px solid rgba(244,63,94,0.2)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.75rem",
                  color: "var(--red)",
                  fontSize: "0.85rem",
                }}
              >
                {error}
              </div>
            )}

            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? "Registering…" : "Register Vendor"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

