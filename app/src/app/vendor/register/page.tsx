'use client';

import { useCallback, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { useAnchorClient } from "@/hooks/useAnchorClient";
import { MARKETPLACE_PROGRAM_ID } from "@/lib/anchor";
import { VendorDashboardNav } from "@/components/VendorDashboardNav";

const VENDOR_TYPES = ["Retailer", "Wholesaler", "Distributor", "Manufacturer"] as const;
const ALL_CATEGORIES = ["Electronics", "Apparel", "HomeGoods", "Machinery", "FoodBeverage", "Chemicals", "Automotive", "Healthcare", "Construction", "Other"];

async function sha256Hex(text: string): Promise<Uint8Array> {
  const encoded = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", encoded);
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
      <main style={{ maxWidth: 600, margin: "0 auto", padding: "3rem 1rem", textAlign: "center" }}>
        <h1>Register as Vendor</h1>
        <p>Connect your wallet to create a vendor shop.</p>
        <WalletMultiButton />
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1rem", display: "flex", gap: "2rem" }}>
      <VendorDashboardNav active="/vendor/register" />
      <div style={{ flex: 1 }}>
        <h1 style={{ margin: "0 0 1.5rem" }}>Shop Profile</h1>
        {done ? (
          <div style={{ color: "#16a34a", fontWeight: 600 }}>✓ Vendor registered successfully!</div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem", maxWidth: 560 }}>
            <div>
              <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>Shop Name *</label>
              <input
                required
                maxLength={64}
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                style={{ display: "block", width: "100%", marginTop: "0.3rem", padding: "0.5rem", border: "1px solid #e2e8f0", borderRadius: 6, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>Shop Description *</label>
              <textarea
                required
                maxLength={256}
                value={shopDesc}
                onChange={(e) => setShopDesc(e.target.value)}
                rows={3}
                style={{ display: "block", width: "100%", marginTop: "0.3rem", padding: "0.5rem", border: "1px solid #e2e8f0", borderRadius: 6, boxSizing: "border-box", resize: "vertical" }}
              />
            </div>
            <div>
              <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>Vendor Type *</label>
              <select
                value={vendorType}
                onChange={(e) => setVendorType(e.target.value)}
                style={{ display: "block", width: "100%", marginTop: "0.3rem", padding: "0.5rem", border: "1px solid #e2e8f0", borderRadius: 6, boxSizing: "border-box" }}
              >
                {VENDOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>Categories (max 8)</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.3rem" }}>
                {ALL_CATEGORIES.map((cat) => (
                  <label key={cat} style={{ display: "flex", alignItems: "center", gap: "0.3rem", cursor: "pointer", fontSize: "0.85rem", padding: "0.2rem 0.5rem", border: `1px solid ${categories.includes(cat) ? "#2563eb" : "#e2e8f0"}`, borderRadius: 6 }}>
                    <input type="checkbox" checked={categories.includes(cat)} onChange={() => toggleCategory(cat)} style={{ display: "none" }} />
                    {cat}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>Contact Email (hashed, not stored)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ display: "block", width: "100%", marginTop: "0.3rem", padding: "0.5rem", border: "1px solid #e2e8f0", borderRadius: 6, boxSizing: "border-box" }}
              />
              <small style={{ color: "#94a3b8" }}>Only a SHA-256 hash is stored on-chain.</small>
            </div>
            {error && <p style={{ color: "#dc2626", fontSize: "0.85rem", margin: 0 }}>{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              style={{ padding: "0.7rem", background: "#1e293b", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
            >
              {submitting ? "Registering…" : "Register Vendor"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
