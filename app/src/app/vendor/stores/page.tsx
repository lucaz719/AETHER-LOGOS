'use client';

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8080";
const STORE_TYPES = ["retail", "wholesale", "distributor", "manufacturer"] as const;
const CATEGORIES = ["Electronics", "Apparel", "HomeGoods", "Machinery", "FoodBeverage", "Chemicals", "Automotive", "Healthcare", "Construction", "Other"];

interface Store {
  id: number;
  owner_wallet: string;
  slug: string;
  store_name: string;
  description: string;
  store_type: string;
  categories: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function VendorStoresPage() {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() ?? "";

  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ storeName: "", description: "", storeType: "retail", categories: [] as string[], slug: "" });
  const [error, setError] = useState<string | null>(null);

  const loadStores = useCallback(async () => {
    if (!wallet) return;
    try {
      const res = await fetch(`${API}/api/vendors/${wallet}/stores`);
      if (res.ok) {
        const data = await res.json();
        setStores(data.stores ?? []);
      }
    } catch { /* offline */ }
    finally { setLoading(false); }
  }, [wallet]);

  useEffect(() => { loadStores(); }, [loadStores]);

  const toggleCategory = (cat: string) => {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(cat) ? f.categories.filter((c) => c !== cat) : f.categories.length < 8 ? [...f.categories, cat] : f.categories,
    }));
  };

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;
    setCreating(true); setError(null);
    try {
      const slug = form.slug || slugify(form.storeName);
      const res = await fetch(`${API}/api/stores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_wallet: wallet,
          slug,
          store_name: form.storeName,
          description: form.description,
          store_type: form.storeType,
          categories: form.categories.join(","),
        }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg);
      }
      setShowForm(false);
      setForm({ storeName: "", description: "", storeType: "retail", categories: [], slug: "" });
      await loadStores();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create store.");
    } finally { setCreating(false); }
  }, [wallet, form, loadStores]);

  if (!publicKey) {
    return (
      <main className="page-container" style={{ textAlign: "center", paddingTop: "4rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>Store</div>
        <h2 style={{ color: "var(--text-primary)", marginBottom: "0.5rem" }}>My Stores</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>Connect your wallet to manage your stores.</p>
        <WalletMultiButton />
      </main>
    );
  }

  return (
    <main className="page-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)" }}>My Stores</h1>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>Manage multiple storefronts from one account</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ New Store"}
        </button>
      </div>

      {showForm && (
        <div className="glass" style={{ padding: "1.5rem", borderRadius: "var(--radius-lg)", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1.25rem" }}>Create New Store</h2>
          <form onSubmit={handleCreate} style={{ display: "grid", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Store Name *</label>
                <input required className="input" style={{ width: "100%" }} placeholder="e.g. Global Tech Parts" maxLength={64} value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>URL Slug *</label>
                <input required className="input" style={{ width: "100%" }} placeholder={form.storeName ? slugify(form.storeName) : "my-store"} maxLength={48} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                <small style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>Unique identifier for your store URL</small>
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Description</label>
              <textarea className="input" style={{ width: "100%", minHeight: 72, resize: "vertical" }} placeholder="Describe your store…" maxLength={512} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Store Type</label>
              <select className="input" style={{ width: 200 }} value={form.storeType} onChange={(e) => setForm({ ...form, storeType: e.target.value })}>
                {STORE_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Categories <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(max 8)</span></label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {CATEGORIES.map((cat) => (
                  <button key={cat} type="button" onClick={() => toggleCategory(cat)} style={{ padding: "0.3rem 0.75rem", borderRadius: "var(--radius-pill)", border: form.categories.includes(cat) ? "1px solid var(--cyan)" : "1px solid var(--border)", background: form.categories.includes(cat) ? "var(--cyan-dim)" : "transparent", color: form.categories.includes(cat) ? "var(--cyan)" : "var(--text-secondary)", fontSize: "0.8rem", cursor: "pointer" }}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            {error && <div style={{ color: "var(--red)", fontSize: "0.85rem", padding: "0.6rem 0.8rem", background: "rgba(239,68,68,0.08)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(239,68,68,0.2)" }}>{error}</div>}
            <button type="submit" className="btn-primary" disabled={creating} style={{ justifySelf: "start" }}>
              {creating ? "Creating…" : "Create Store"}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ color: "var(--text-muted)", padding: "2rem" }}>Loading stores…</div>
      ) : stores.length === 0 ? (
        <div className="glass" style={{ padding: "3rem", textAlign: "center", borderRadius: "var(--radius-lg)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>Store</div>
          <h3 style={{ color: "var(--text-primary)", marginBottom: "0.5rem" }}>No stores yet</h3>
          <p style={{ color: "var(--text-muted)", marginBottom: "1.25rem" }}>Create your first store to start selling.</p>
          <button className="btn-primary" onClick={() => setShowForm(true)}>Create Store</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
          {stores.map((store) => (
            <div key={store.id} className="glass" style={{ padding: "1.5rem", borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>{store.store_name}</h3>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "monospace" }}>/{store.slug}</div>
                </div>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  {store.is_verified && <span style={{ fontSize: "0.7rem", padding: "0.15rem 0.5rem", borderRadius: "var(--radius-pill)", background: "var(--green-dim)", color: "var(--green)", border: "1px solid rgba(16,185,129,0.2)" }}>✓ Verified</span>}
                  <span style={{ fontSize: "0.7rem", padding: "0.15rem 0.5rem", borderRadius: "var(--radius-pill)", background: store.is_active ? "var(--cyan-dim)" : "rgba(255,255,255,0.04)", color: store.is_active ? "var(--cyan)" : "var(--text-muted)", border: "1px solid var(--border)" }}>{store.is_active ? "Active" : "Inactive"}</span>
                </div>
              </div>
              {store.description && <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{store.description}</p>}
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                {store.store_type} · Created {new Date(store.created_at).toLocaleDateString()}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto" }}>
                <Link href={`/vendor/store/${store.id}/dashboard`} className="btn-primary" style={{ textDecoration: "none", fontSize: "0.82rem", flex: 1, textAlign: "center" }}>
                  Manage →
                </Link>
                <Link href={`/vendor/store/${store.id}/settings`} className="btn-ghost" style={{ textDecoration: "none", fontSize: "0.82rem" }}>
                  Settings
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
