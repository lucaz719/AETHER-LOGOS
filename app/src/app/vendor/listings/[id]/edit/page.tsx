'use client';

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useAnchorClient } from "@/hooks/useAnchorClient";
import { MARKET_PROGRAM_ID } from "@/lib/anchor";
import { VendorDashboardNav } from "@/components/VendorDashboardNav";
import { Skeleton } from "@/components/Skeleton";

const CATEGORIES = ["Electronics", "Apparel", "HomeGoods", "Machinery", "FoodBeverage", "Chemicals", "Automotive", "Healthcare", "Construction", "Other"];

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: "0.35rem" }}>
      <label style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)" }}>{label}</label>
      {children}
    </div>
  );
}

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { publicKey } = useWallet();
  const { marketProgram } = useAnchorClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Electronics");
  const [priceUsd, setPriceUsd] = useState("");
  const [minQty, setMinQty] = useState(1);
  const [maxQty, setMaxQty] = useState("");
  const [stock, setStock] = useState("");
  const [deadlineHours, setDeadlineHours] = useState(48);
  const [requiresSig, setRequiresSig] = useState(false);
  const [imagesCid, setImagesCid] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/marketplace/listings/${id}`)
      .then((r) => r.json())
      .then((d) => {
        const acc = (d.account ?? d.listing) as Record<string, unknown>;
        setTitle(String(acc.title ?? ""));
        setDescription(String(acc.description ?? ""));
        setCategory(Object.keys(acc.category as Record<string, unknown>)[0] ?? "Electronics");
        setPriceUsd(((Number(acc.price_usdc ?? 0)) / 1_000_000).toString());
        setMinQty(Number(acc.min_order_qty ?? 1));
        setMaxQty(acc.max_order_qty ? String(acc.max_order_qty) : "");
        setStock(acc.stock ? String(acc.stock) : "");
        setDeadlineHours(Number(acc.shipping_deadline_hours ?? 48));
        setRequiresSig(Boolean(acc.requires_signature));
        setImagesCid(acc.images_cid as string | null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!publicKey) return;
      setUploading(true);
      setError(null);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`/api/marketplace/listings/${id}/upload`, {
          method: "POST",
          body: formData,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Upload failed");
        setImagesCid(json.cid);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [publicKey, id],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!marketProgram || !publicKey || !id) return;
      setSubmitting(true);
      setError(null);
      try {
        const priceUsdc = Math.round(parseFloat(priceUsd) * 1_000_000);
        const catObj: Record<string, Record<string, never>> = {};
        const catKey = category.charAt(0).toLowerCase() + category.slice(1);
        catObj[catKey] = {};

        const [vendorProfilePda] = PublicKey.findProgramAddressSync(
          [Buffer.from("vendor"), publicKey.toBuffer()],
          MARKET_PROGRAM_ID,
        );

        await (marketProgram.methods as any)
          .updateListing(
            title, description, imagesCid, catObj, priceUsdc, minQty,
            maxQty ? parseInt(maxQty) : null,
            stock ? parseInt(stock) : null,
            deadlineHours, requiresSig,
          )
          .accounts({ authority: publicKey, vendorProfile: vendorProfilePda, listing: new PublicKey(id) })
          .rpc();
        router.push("/vendor/listings");
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setSubmitting(false);
      }
    },
    [marketProgram, publicKey, id, title, description, category, priceUsd, minQty, maxQty, stock, deadlineHours, requiresSig, imagesCid, router],
  );

  if (loading) {
    return (
      <main className="page-container" style={{ display: "flex", gap: "2rem" }}>
        <div style={{ minWidth: 190 }}><Skeleton height={200} /></div>
        <div style={{ flex: 1, display: "grid", gap: "1rem" }}>
          <Skeleton height={32} width="40%" />
          <Skeleton height={44} />
          <Skeleton height={100} />
          <Skeleton height={44} />
        </div>
      </main>
    );
  }

  return (
    <main className="page-container" style={{ display: "flex", gap: "2rem" }}>
      <VendorDashboardNav active="/vendor/dashboard" />
      <div style={{ flex: 1 }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "1.75rem" }}>
          Edit Listing
        </h1>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1.25rem", maxWidth: 580 }}>
          <FormField label="Title *">
            <input required maxLength={128} value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
          </FormField>

          <FormField label="Description *">
            <textarea required maxLength={512} value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="input" style={{ resize: "vertical" }} />
          </FormField>

          {/* Image upload */}
          <FormField label="Product Image">
            <div
              style={{
                border: "1px dashed var(--border-accent)",
                borderRadius: "var(--radius-md)",
                padding: "1.25rem",
                textAlign: "center",
                cursor: "pointer",
                background: "var(--bg-surface)",
              }}
              onClick={() => document.getElementById("edit-image-input")?.click()}
            >
              {imagesCid ? (
                <>
                  <div className="badge badge-green" style={{ display: "inline-flex" }}>✓ Image</div>
                  <div className="addr" style={{ marginTop: "0.4rem" }}>{imagesCid.slice(0, 20)}…</div>
                </>
              ) : uploading ? (
                <span style={{ color: "var(--text-muted)" }}>Uploading…</span>
              ) : (
                <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Click to replace image</div>
              )}
              <input
                id="edit-image-input"
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleImageUpload(f);
                }}
              />
            </div>
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <FormField label="Category *">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </FormField>
            <FormField label="Price (USDC) *">
              <input required type="number" min="0.000001" step="0.01" value={priceUsd} onChange={(e) => setPriceUsd(e.target.value)} className="input" />
            </FormField>
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

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button type="submit" disabled={submitting || uploading} className="btn-primary">
              {submitting ? "Saving…" : "Save Changes"}
            </button>
            <button type="button" className="btn-ghost" onClick={() => router.back()}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

