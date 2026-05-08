"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { useRouter } from "next/navigation";
import { useAnchorClient } from "@/hooks/useAnchorClient";
import { MARKET_PROGRAM_ID } from "@/lib/anchor";
import { VendorDashboardNav } from "@/components/VendorDashboardNav";
import { Skeleton } from "@/components/Skeleton";
import { CheckCircle2, KeyRound } from "lucide-react";

const VENDOR_TYPES = ["Retailer", "Wholesaler", "Distributor", "Manufacturer"] as const;
const CATEGORY_OPTIONS = [
  "Electronics","Apparel","HomeGoods","Machinery","FoodBeverage",
  "Chemicals","Automotive","Healthcare","Construction","Other",
] as const;

type FormState = {
  shopName: string;
  shopDescription: string;
  vendorType: string;
  categories: string[];
  logoCid: string;
  bannerCid: string;
};

export default function EditVendorProfilePage() {
  const { publicKey } = useWallet();
  const { marketProgram } = useAnchorClient();
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    shopName: "",
    shopDescription: "",
    vendorType: "Retailer",
    categories: [],
    logoCid: "",
    bannerCid: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  // Load existing vendor profile on mount
  useEffect(() => {
    if (!publicKey || !marketProgram) return;

    async function load() {
      setLoading(true);
      try {
        const [vendorProfilePda] = PublicKey.findProgramAddressSync(
          [Buffer.from("vendor"), publicKey!.toBuffer()],
          MARKET_PROGRAM_ID,
        );
        const profile = await (marketProgram!.account as any).vendorProfile.fetch(vendorProfilePda);
        const vt = profile.vendorType as Record<string, unknown>;
        const vendorType = vt ? Object.keys(vt)[0] ?? "Retailer" : "Retailer";

        setForm({
          shopName: profile.shopName ?? "",
          shopDescription: profile.shopDescription ?? "",
          vendorType: vendorType.charAt(0).toUpperCase() + vendorType.slice(1),
          categories: (profile.categories as string[]) ?? [],
          logoCid: profile.logoCid ?? "",
          bannerCid: profile.bannerCid ?? "",
        });
      } catch {
        setError("Could not load your vendor profile. Make sure you are registered.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [publicKey, marketProgram]);

  // Image upload helper
  async function uploadImage(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    return data.cid as string;
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const cid = await uploadImage(file);
      setForm((f) => ({ ...f, logoCid: cid }));
    } catch {
      setError("Logo upload failed. Please try again.");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const cid = await uploadImage(file);
      setForm((f) => ({ ...f, bannerCid: cid }));
    } catch {
      setError("Banner upload failed. Please try again.");
    } finally {
      setUploadingBanner(false);
    }
  }

  function toggleCategory(cat: string) {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter((c) => c !== cat)
        : f.categories.length < 8
        ? [...f.categories, cat]
        : f.categories,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!marketProgram || !publicKey) return;

    setError(null);
    setSaving(true);
    setSuccess(false);

    try {
      if (!form.shopName.trim()) throw new Error("Shop name is required.");
      if (form.shopName.length > 64) throw new Error("Shop name must be ≤ 64 characters.");
      if (form.shopDescription.length > 256) throw new Error("Description must be ≤ 256 characters.");

      const [vendorProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vendor"), publicKey.toBuffer()],
        MARKET_PROGRAM_ID,
      );

      const vtKey = form.vendorType.toLowerCase();
      const vendorTypeArg = { [vtKey]: {} };
      const categoriesArg = form.categories;
      const logoCidArg = form.logoCid.trim() || null;
      const bannerCidArg = form.bannerCid.trim() || null;

      await (marketProgram.methods as any)
        .updateVendor(
          form.shopName.trim(),
          form.shopDescription.trim(),
          logoCidArg,
          bannerCidArg,
          vendorTypeArg,
          categoriesArg,
        )
        .accounts({
          authority: publicKey,
          vendorProfile: vendorProfilePda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setSuccess(true);
      setTimeout(() => router.push("/vendor/dashboard"), 1500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (!publicKey) {
    return (
      <main className="page-container" style={{ textAlign: "center", paddingTop: "4rem" }}>
        <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "center" }}>
          <KeyRound size={42} color="var(--text-secondary)" />
        </div>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
          Connect your wallet to edit your vendor profile.
        </p>
        <WalletMultiButton />
      </main>
    );
  }

  const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? "https://gateway.pinata.cloud/ipfs";

  return (
    <main className="page-container" style={{ display: "flex", gap: "2rem" }}>
      <VendorDashboardNav active="/vendor/profile/edit" />

      <div style={{ flex: 1, maxWidth: 680 }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "1.75rem" }}>
          Edit Shop Profile
        </h1>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[80, 120, 60, 60].map((h, i) => <Skeleton key={i} height={h} />)}
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* Success banner */}
            {success && (
              <div style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)", borderRadius: "var(--radius-md)", padding: "0.85rem 1rem", color: "var(--green)", fontSize: "0.9rem" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                  <CheckCircle2 size={16} />
                  Profile updated — redirecting to dashboard…
                </span>
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: "var(--radius-md)", padding: "0.85rem 1rem", color: "var(--red)", fontSize: "0.85rem" }}>
                {error}
              </div>
            )}

            {/* Shop Name */}
            <div className="form-group">
              <label className="form-label">Shop Name <span style={{ color: "var(--red)" }}>*</span></label>
              <input
                className="form-input"
                type="text"
                maxLength={64}
                value={form.shopName}
                onChange={(e) => setForm((f) => ({ ...f, shopName: e.target.value }))}
                placeholder="My Awesome Shop"
                required
              />
              <div className="form-hint">{form.shopName.length}/64</div>
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">Shop Description</label>
              <textarea
                className="form-input"
                maxLength={256}
                rows={4}
                value={form.shopDescription}
                onChange={(e) => setForm((f) => ({ ...f, shopDescription: e.target.value }))}
                placeholder="Tell buyers about your shop…"
                style={{ resize: "vertical" }}
              />
              <div className="form-hint">{form.shopDescription.length}/256</div>
            </div>

            {/* Vendor Type */}
            <div className="form-group">
              <label className="form-label">Vendor Type</label>
              <select
                className="form-input"
                value={form.vendorType}
                onChange={(e) => setForm((f) => ({ ...f, vendorType: e.target.value }))}
              >
                {VENDOR_TYPES.map((vt) => <option key={vt}>{vt}</option>)}
              </select>
            </div>

            {/* Categories */}
            <div className="form-group">
              <label className="form-label">Categories <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: "0.8rem" }}>(max 8)</span></label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.4rem" }}>
                {CATEGORY_OPTIONS.map((cat) => {
                  const active = form.categories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      style={{
                        padding: "0.35rem 0.8rem",
                        borderRadius: "var(--radius-pill)",
                        border: `1px solid ${active ? "var(--cyan)" : "var(--border)"}`,
                        background: active ? "var(--cyan-dim)" : "transparent",
                        color: active ? "var(--cyan)" : "var(--text-secondary)",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Logo upload */}
            <div className="form-group">
              <label className="form-label">Shop Logo</label>
              {form.logoCid && (
                <div style={{ marginBottom: "0.75rem" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${gateway}/${form.logoCid}`}
                    alt="Logo preview"
                    style={{ width: 80, height: 80, objectFit: "cover", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}
              <input ref={logoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoChange} />
              <button type="button" className="btn-ghost" onClick={() => logoRef.current?.click()} disabled={uploadingLogo}>
                {uploadingLogo ? "Uploading…" : form.logoCid ? "Change Logo" : "Upload Logo"}
              </button>
              {form.logoCid && (
                <button type="button" className="btn-ghost" onClick={() => setForm((f) => ({ ...f, logoCid: "" }))} style={{ marginLeft: "0.5rem", color: "var(--red)" }}>
                  Remove
                </button>
              )}
            </div>

            {/* Banner upload */}
            <div className="form-group">
              <label className="form-label">Shop Banner</label>
              {form.bannerCid && (
                <div style={{ marginBottom: "0.75rem" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${gateway}/${form.bannerCid}`}
                    alt="Banner preview"
                    style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}
              <input ref={bannerRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleBannerChange} />
              <button type="button" className="btn-ghost" onClick={() => bannerRef.current?.click()} disabled={uploadingBanner}>
                {uploadingBanner ? "Uploading…" : form.bannerCid ? "Change Banner" : "Upload Banner"}
              </button>
              {form.bannerCid && (
                <button type="button" className="btn-ghost" onClick={() => setForm((f) => ({ ...f, bannerCid: "" }))} style={{ marginLeft: "0.5rem", color: "var(--red)" }}>
                  Remove
                </button>
              )}
            </div>

            {/* Submit */}
            <div style={{ display: "flex", gap: "0.75rem", paddingTop: "0.5rem" }}>
              <button
                type="submit"
                className="btn-primary"
                disabled={saving || uploadingLogo || uploadingBanner}
                style={{ flex: 1 }}
              >
                {saving ? "Saving on-chain…" : "Save Profile"}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => router.push("/vendor/dashboard")}
                style={{ padding: "0 1.25rem" }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
