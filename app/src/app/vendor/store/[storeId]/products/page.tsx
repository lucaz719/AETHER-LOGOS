'use client';

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const API = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8080";
const CATEGORIES = ["Electronics", "Apparel", "HomeGoods", "Machinery", "FoodBeverage", "Chemicals", "Automotive", "Healthcare", "Construction", "Other"];

interface Product {
  id: number;
  vendor_wallet: string;
  title: string;
  description: string;
  short_description: string;
  price_usdc: number;
  category: string;
  image_url: string;
  in_stock: boolean;
  moq: number;
  lead_time_days: number;
  rating: number;
  seller_tier: "distributor" | "wholesaler" | "manufacturer";
  created_at: string;
}

export default function StoreProductsPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() ?? "";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    shortDescription: "",
    priceUsdc: "",
    category: "Electronics",
    imageUrl: "",
    inStock: true,
    moq: "1",
    leadTimeDays: "7",
    rating: "4.5",
    sellerTier: "wholesaler" as "distributor" | "wholesaler" | "manufacturer",
  });

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/stores/${storeId}/products`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products ?? []);
      }
    } catch { /* offline */ }
    finally { setLoading(false); }
  }, [storeId]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      shortDescription: "",
      priceUsdc: "",
      category: "Electronics",
      imageUrl: "",
      inStock: true,
      moq: "1",
      leadTimeDays: "7",
      rating: "4.5",
      sellerTier: "wholesaler",
    });
    setEditId(null);
    setError(null);
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;
    setSubmitting(true); setError(null);
    try {
      const price = parseFloat(form.priceUsdc);
      if (isNaN(price) || price <= 0) throw new Error("Price must be a positive number.");
      const moq = parseInt(form.moq, 10);
      const leadTimeDays = parseInt(form.leadTimeDays, 10);
      const rating = parseFloat(form.rating);
      if (isNaN(moq) || moq <= 0) throw new Error("MOQ must be a positive integer.");
      if (isNaN(leadTimeDays) || leadTimeDays <= 0) throw new Error("Lead time must be a positive integer.");
      if (isNaN(rating) || rating <= 0 || rating > 5) throw new Error("Rating must be between 0 and 5.");

      const body = {
        owner_wallet: wallet,
        title: form.title,
        description: form.description,
        short_description: form.shortDescription,
        price_usdc: price,
        category: form.category,
        image_url: form.imageUrl,
        in_stock: form.inStock,
        moq,
        lead_time_days: leadTimeDays,
        rating,
        seller_tier: form.sellerTier,
      };

      let res: Response;
      if (editId) {
        res = await fetch(`${API}/api/stores/${storeId}/products/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`${API}/api/stores/${storeId}/products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) throw new Error(await res.text());
      resetForm();
      setShowForm(false);
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving product.");
    } finally { setSubmitting(false); }
  }, [wallet, storeId, form, editId, loadProducts]);

  const handleEdit = (p: Product) => {
    setForm({
      title: p.title,
      description: p.description,
      shortDescription: p.short_description || "",
      priceUsdc: String(p.price_usdc),
      category: p.category,
      imageUrl: p.image_url,
      inStock: p.in_stock,
      moq: String(p.moq ?? 1),
      leadTimeDays: String(p.lead_time_days ?? 7),
      rating: String(p.rating ?? 4.5),
      sellerTier: p.seller_tier || "wholesaler",
    });
    setEditId(p.id);
    setShowForm(true);
  };

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm("Delete this product?")) return;
    await fetch(`${API}/api/stores/${storeId}/products/${id}?owner_wallet=${wallet}`, { method: "DELETE" });
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, [storeId, wallet]);

  if (!publicKey) {
    return <div style={{ textAlign: "center", paddingTop: "4rem" }}><WalletMultiButton /></div>;
  }

  const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)" }}>Products ({products.length})</h1>
        <button className="btn-primary" onClick={() => { resetForm(); setShowForm((v) => !v); }}>
          {showForm ? "Cancel" : "+ Add Product"}
        </button>
      </div>

      {showForm && (
        <div className="glass" style={{ padding: "1.5rem", borderRadius: "var(--radius-lg)", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>
            {editId ? "Edit Product" : "New Product"}
          </h2>
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Title *</label>
                <input required className="input" style={inputStyle} placeholder="Product title" maxLength={128} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Price (USDC) *</label>
                <input required type="number" step="0.01" min="0.01" className="input" style={inputStyle} placeholder="9.99" value={form.priceUsdc} onChange={(e) => setForm({ ...form, priceUsdc: e.target.value })} />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Description</label>
              <textarea className="input" style={{ ...inputStyle, minHeight: 72, resize: "vertical" }} placeholder="Describe your product…" maxLength={512} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Short Description</label>
              <input className="input" style={inputStyle} placeholder="Short summary for marketplace card" maxLength={160} value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Category</label>
                <select className="input" style={inputStyle} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Image URL</label>
                <input type="url" className="input" style={inputStyle} placeholder="https://…" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>MOQ</label>
                <input required type="number" min="1" className="input" style={inputStyle} value={form.moq} onChange={(e) => setForm({ ...form, moq: e.target.value })} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Lead Days</label>
                <input required type="number" min="1" className="input" style={inputStyle} value={form.leadTimeDays} onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Rating</label>
                <input required type="number" min="0" max="5" step="0.1" className="input" style={inputStyle} value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Seller Tier</label>
                <select className="input" style={inputStyle} value={form.sellerTier} onChange={(e) => setForm({ ...form, sellerTier: e.target.value as "distributor" | "wholesaler" | "manufacturer" })}>
                  <option value="distributor">Distributor</option>
                  <option value="wholesaler">Wholesaler</option>
                  <option value="manufacturer">Manufacturer</option>
                </select>
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)", cursor: "pointer" }}>
              <input type="checkbox" checked={form.inStock} onChange={(e) => setForm({ ...form, inStock: e.target.checked })} />
              In Stock
            </label>
            {error && <div style={{ color: "var(--red)", fontSize: "0.82rem", padding: "0.6rem 0.8rem", background: "rgba(239,68,68,0.08)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(239,68,68,0.2)" }}>{error}</div>}
            <button type="submit" className="btn-primary" disabled={submitting} style={{ justifySelf: "start" }}>
              {submitting ? "Saving…" : editId ? "Save Changes" : "Add Product"}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ color: "var(--text-muted)", padding: "2rem" }}>Loading products…</div>
      ) : products.length === 0 ? (
        <div className="glass" style={{ padding: "3rem", textAlign: "center", borderRadius: "var(--radius-lg)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>📦</div>
          <p style={{ color: "var(--text-muted)" }}>No products yet. Add your first product above.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {products.map((p) => (
            <div key={p.id} className="glass" style={{ padding: "1rem 1.25rem", borderRadius: "var(--radius-md)", display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: "1rem", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.9rem" }}>{p.title}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  {p.category} · ${p.price_usdc.toFixed(2)} USDC · MOQ {p.moq} · {p.lead_time_days}d · ★{p.rating.toFixed(1)} · {p.seller_tier}
                </div>
              </div>
              <span style={{ padding: "0.2rem 0.6rem", borderRadius: "var(--radius-pill)", fontSize: "0.72rem", fontWeight: 700, color: p.in_stock ? "var(--green)" : "var(--red)", background: p.in_stock ? "var(--green-dim)" : "rgba(239,68,68,0.1)", border: `1px solid ${p.in_stock ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}` }}>
                {p.in_stock ? "In Stock" : "Out of Stock"}
              </span>
              <button className="btn-ghost" style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem" }} onClick={() => handleEdit(p)}>Edit</button>
              <button className="btn-danger" style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem" }} onClick={() => handleDelete(p.id)}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
