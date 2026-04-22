'use client';

import { useCallback, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { useAnchorClient } from "@/hooks/useAnchorClient";
import { MARKETPLACE_PROGRAM_ID } from "@/lib/anchor";
import { VendorDashboardNav } from "@/components/VendorDashboardNav";

const CATEGORIES = ["Electronics", "Apparel", "HomeGoods", "Machinery", "FoodBeverage", "Chemicals", "Automotive", "Healthcare", "Construction", "Other"];

function randomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  if (typeof window !== "undefined" && window.crypto) window.crypto.getRandomValues(buf);
  return buf;
}

export default function NewListingPage() {
  const { publicKey } = useWallet();
  const { marketplaceProgram } = useAnchorClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Electronics");
  const [priceUsd, setPriceUsd] = useState("");
  const [minQty, setMinQty] = useState(1);
  const [maxQty, setMaxQty] = useState("");
  const [stock, setStock] = useState("");
  const [deadlineHours, setDeadlineHours] = useState(48);
  const [requiresSig, setRequiresSig] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!marketplaceProgram || !publicKey) return;
      setSubmitting(true);
      setError(null);
      try {
        const listingId = Array.from(randomBytes(16));
        const priceUsdc = Math.round(parseFloat(priceUsd) * 1_000_000);
        const catObj: Record<string, Record<string, never>> = {};
        const catKey = category.charAt(0).toLowerCase() + category.slice(1);
        catObj[catKey] = {};

        const [vendorProfilePda] = PublicKey.findProgramAddressSync(
          [Buffer.from("vendor"), publicKey.toBuffer()],
          MARKETPLACE_PROGRAM_ID,
        );
        const [listingPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("listing"), publicKey.toBuffer(), Buffer.from(listingId)],
          MARKETPLACE_PROGRAM_ID,
        );

        await (marketplaceProgram.methods as any)
          .createListing(
            listingId,
            title,
            description,
            null,
            catObj,
            priceUsdc,
            minQty,
            maxQty ? parseInt(maxQty) : null,
            stock ? parseInt(stock) : null,
            deadlineHours,
            requiresSig,
          )
          .accounts({
            authority: publicKey,
            vendorProfile: vendorProfilePda,
            listing: listingPda,
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
    [marketplaceProgram, publicKey, title, description, category, priceUsd, minQty, maxQty, stock, deadlineHours, requiresSig],
  );

  if (!publicKey) {
    return (
      <main style={{ maxWidth: 700, margin: "0 auto", padding: "3rem 1rem", textAlign: "center" }}>
        <h1>Create Listing</h1>
        <WalletMultiButton />
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1rem", display: "flex", gap: "2rem" }}>
      <VendorDashboardNav active="/vendor/listings/new" />
      <div style={{ flex: 1 }}>
        <h1 style={{ margin: "0 0 1.5rem" }}>New Listing</h1>
        {done ? (
          <div style={{ color: "#16a34a", fontWeight: 600 }}>✓ Listing created on-chain!</div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem", maxWidth: 560 }}>
            <div>
              <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>Title *</label>
              <input required maxLength={128} value={title} onChange={(e) => setTitle(e.target.value)}
                style={{ display: "block", width: "100%", marginTop: "0.3rem", padding: "0.5rem", border: "1px solid #e2e8f0", borderRadius: 6, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>Description *</label>
              <textarea required maxLength={512} value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
                style={{ display: "block", width: "100%", marginTop: "0.3rem", padding: "0.5rem", border: "1px solid #e2e8f0", borderRadius: 6, boxSizing: "border-box", resize: "vertical" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>Category *</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}
                  style={{ display: "block", width: "100%", marginTop: "0.3rem", padding: "0.5rem", border: "1px solid #e2e8f0", borderRadius: 6, boxSizing: "border-box" }}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>Price (USDC) *</label>
                <input required type="number" min="0.000001" step="0.01" value={priceUsd} onChange={(e) => setPriceUsd(e.target.value)}
                  style={{ display: "block", width: "100%", marginTop: "0.3rem", padding: "0.5rem", border: "1px solid #e2e8f0", borderRadius: 6, boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>Min Qty *</label>
                <input type="number" min={1} value={minQty} onChange={(e) => setMinQty(parseInt(e.target.value))}
                  style={{ display: "block", width: "100%", marginTop: "0.3rem", padding: "0.5rem", border: "1px solid #e2e8f0", borderRadius: 6, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>Max Qty</label>
                <input type="number" min={1} value={maxQty} onChange={(e) => setMaxQty(e.target.value)} placeholder="Unlimited"
                  style={{ display: "block", width: "100%", marginTop: "0.3rem", padding: "0.5rem", border: "1px solid #e2e8f0", borderRadius: 6, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>Stock</label>
                <input type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Unlimited"
                  style={{ display: "block", width: "100%", marginTop: "0.3rem", padding: "0.5rem", border: "1px solid #e2e8f0", borderRadius: 6, boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", alignItems: "center" }}>
              <div>
                <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>Ship Deadline (hours) *</label>
                <input type="number" min={1} value={deadlineHours} onChange={(e) => setDeadlineHours(parseInt(e.target.value))}
                  style={{ display: "block", width: "100%", marginTop: "0.3rem", padding: "0.5rem", border: "1px solid #e2e8f0", borderRadius: 6, boxSizing: "border-box" }} />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem", marginTop: "1.2rem" }}>
                <input type="checkbox" checked={requiresSig} onChange={(e) => setRequiresSig(e.target.checked)} />
                Requires Signature
              </label>
            </div>
            {error && <p style={{ color: "#dc2626", fontSize: "0.85rem", margin: 0 }}>{error}</p>}
            <button type="submit" disabled={submitting}
              style={{ padding: "0.7rem", background: "#1e293b", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
              {submitting ? "Creating…" : "Create Listing"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
