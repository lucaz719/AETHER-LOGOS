'use client';

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useAnchorClient } from "@/hooks/useAnchorClient";
import { MARKETPLACE_PROGRAM_ID } from "@/lib/anchor";
import { VendorDashboardNav } from "@/components/VendorDashboardNav";

const CATEGORIES = ["Electronics", "Apparel", "HomeGoods", "Machinery", "FoodBeverage", "Chemicals", "Automotive", "Healthcare", "Construction", "Other"];

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/marketplace/listings/${id}`)
      .then((r) => r.json())
      .then((d) => {
        const acc = d.listing as Record<string, unknown>;
        setTitle(String(acc.title ?? ""));
        setDescription(String(acc.description ?? ""));
        setCategory(Object.keys(acc.category as Record<string, unknown>)[0] ?? "Electronics");
        setPriceUsd(((Number(acc.price_usdc ?? 0)) / 1_000_000).toString());
        setMinQty(Number(acc.min_order_qty ?? 1));
        setMaxQty(acc.max_order_qty ? String(acc.max_order_qty) : "");
        setStock(acc.stock ? String(acc.stock) : "");
        setDeadlineHours(Number(acc.shipping_deadline_hours ?? 48));
        setRequiresSig(Boolean(acc.requires_signature));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!marketplaceProgram || !publicKey || !id) return;
      setSubmitting(true);
      setError(null);
      try {
        const priceUsdc = Math.round(parseFloat(priceUsd) * 1_000_000);
        const catObj: Record<string, Record<string, never>> = {};
        const catKey = category.charAt(0).toLowerCase() + category.slice(1);
        catObj[catKey] = {};

        const [vendorProfilePda] = PublicKey.findProgramAddressSync(
          [Buffer.from("vendor"), publicKey.toBuffer()],
          MARKETPLACE_PROGRAM_ID,
        );

        await (marketplaceProgram.methods as any)
          .updateListing(
            title, description, null, catObj, priceUsdc, minQty,
            maxQty ? parseInt(maxQty) : null,
            stock ? parseInt(stock) : null,
            deadlineHours, requiresSig,
          )
          .accounts({ authority: publicKey, vendorProfile: vendorProfilePda, listing: new PublicKey(id) })
          .rpc();
        router.push("/vendor/dashboard");
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setSubmitting(false);
      }
    },
    [marketplaceProgram, publicKey, id, title, description, category, priceUsd, minQty, maxQty, stock, deadlineHours, requiresSig, router],
  );

  if (loading) return <main style={{ padding: "2rem" }}>Loading…</main>;

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1rem", display: "flex", gap: "2rem" }}>
      <VendorDashboardNav active="/vendor/dashboard" />
      <div style={{ flex: 1 }}>
        <h1 style={{ margin: "0 0 1.5rem" }}>Edit Listing</h1>
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
          {error && <p style={{ color: "#dc2626", fontSize: "0.85rem", margin: 0 }}>{error}</p>}
          <button type="submit" disabled={submitting}
            style={{ padding: "0.7rem", background: "#1e293b", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
            {submitting ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>
    </main>
  );
}
