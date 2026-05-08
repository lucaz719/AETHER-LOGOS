'use client';

import { useCallback, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { useAnchorClient } from "@/hooks/useAnchorClient";
import { MARKET_PROGRAM_ID } from "@/lib/anchor";
import { VendorDashboardNav } from "@/components/VendorDashboardNav";
import Link from "next/link";
import { CheckCircle2, ImageIcon } from "lucide-react";

const CATEGORIES = ["Electronics", "Apparel", "HomeGoods", "Machinery", "FoodBeverage", "Chemicals", "Automotive", "Healthcare", "Construction", "Other"];

function randomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  if (typeof window !== "undefined" && window.crypto) window.crypto.getRandomValues(buf);
  return buf;
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: "0.35rem" }}>
      <label style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)" }}>{label}</label>
      {children}
    </div>
  );
}

export default function NewListingPage() {
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagesCid, setImagesCid] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!publicKey) return;
      setUploading(true);
      setError(null);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`/api/marketplace/listings/${publicKey.toBase58()}/upload`, {
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
    [publicKey],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!marketProgram || !publicKey) return;
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
          MARKET_PROGRAM_ID,
        );
        const [listingPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("listing"), publicKey.toBuffer(), Buffer.from(listingId)],
          MARKET_PROGRAM_ID,
        );

        await (marketProgram.methods as any)
          .createListing(
            listingId,
            title,
            description,
            imagesCid,
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
    [marketProgram, publicKey, title, description, category, priceUsd, minQty, maxQty, stock, deadlineHours, requiresSig, imagesCid],
  );

  if (!publicKey) {
    return (
      <main className="page-container" style={{ textAlign: "center", paddingTop: "4rem" }}>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>Connect your wallet to create a listing.</p>
        <WalletMultiButton />
      </main>
    );
  }

  return (
    <main className="page-container" style={{ display: "flex", gap: "2rem" }}>
      <VendorDashboardNav active="/vendor/listings/new" />
      <div style={{ flex: 1 }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "1.75rem" }}>
          New Listing
        </h1>
        {done ? (
          <div className="glass" style={{ textAlign: "center", padding: "3rem" }}>
            <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "center" }}>
              <CheckCircle2 size={44} color="var(--green)" />
            </div>
            <h2 style={{ color: "var(--green)", marginBottom: "0.5rem" }}>Listing created on-chain!</h2>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "1.25rem" }}>
              <Link href="/vendor/listings" className="btn-primary" style={{ textDecoration: "none" }}>
                View Listings
              </Link>
              <button className="btn-ghost" onClick={() => { setDone(false); setTitle(""); setDescription(""); setPriceUsd(""); setImagesCid(null); }}>
                Create Another
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1.25rem", maxWidth: 580 }}>
            <FormField label="Title *">
              <input required maxLength={128} value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="Product name" />
            </FormField>

            <FormField label="Description *">
              <textarea
                required
                maxLength={512}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="input"
                style={{ resize: "vertical" }}
                placeholder="Describe your product…"
              />
            </FormField>

            {/* Image upload */}
            <FormField label="Product Image">
              <div
                style={{
                  border: "1px dashed var(--border-accent)",
                  borderRadius: "var(--radius-md)",
                  padding: "1.5rem",
                  textAlign: "center",
                  cursor: "pointer",
                  background: "var(--bg-surface)",
                }}
                onClick={() => document.getElementById("image-upload-input")?.click()}
              >
                {imagesCid ? (
                  <>
                    <div className="badge badge-green" style={{ display: "inline-flex" }}>✓ Image uploaded</div>
                    <div className="addr" style={{ marginTop: "0.4rem" }}>{imagesCid.slice(0, 20)}…</div>
                  </>
                ) : uploading ? (
                  <span style={{ color: "var(--text-muted)" }}>Uploading to IPFS…</span>
                ) : (
                  <>
                    <div style={{ marginBottom: "0.4rem", display: "flex", justifyContent: "center" }}>
                      <ImageIcon size={28} color="var(--text-secondary)" />
                    </div>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Click to upload image (pinned to IPFS)</div>
                  </>
                )}
                <input
                  id="image-upload-input"
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setImageFile(f); void handleImageUpload(f); }
                  }}
                />
              </div>
            </FormField>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
              <FormField label="Category *">
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </FormField>
              <FormField label="Price (USDC) *">
                <input required type="number" min="0.000001" step="0.01" value={priceUsd} onChange={(e) => setPriceUsd(e.target.value)} className="input" placeholder="e.g. 25.00" />
              </FormField>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
              <FormField label="Min Qty *">
                <input type="number" min={1} value={minQty} onChange={(e) => setMinQty(parseInt(e.target.value))} className="input" />
              </FormField>
              <FormField label="Max Qty">
                <input type="number" min={1} value={maxQty} onChange={(e) => setMaxQty(e.target.value)} placeholder="Unlimited" className="input" />
              </FormField>
              <FormField label="Stock">
                <input type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Unlimited" className="input" />
              </FormField>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", alignItems: "end" }}>
              <FormField label="Ship Deadline (hours) *">
                <input type="number" min={1} value={deadlineHours} onChange={(e) => setDeadlineHours(parseInt(e.target.value))} className="input" />
              </FormField>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  cursor: "pointer",
                  fontSize: "0.88rem",
                  color: "var(--text-secondary)",
                  paddingBottom: "0.1rem",
                }}
              >
                <input
                  type="checkbox"
                  checked={requiresSig}
                  onChange={(e) => setRequiresSig(e.target.checked)}
                  style={{ accentColor: "var(--cyan)", width: 16, height: 16 }}
                />
                Requires Signature
              </label>
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

            <button type="submit" disabled={submitting || uploading} className="btn-primary">
              {submitting ? "Creating…" : uploading ? "Waiting for upload…" : "Create Listing"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

