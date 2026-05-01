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
  price_usdc: number;
  category: string;
  image_url: string;
  in_stock: boolean;
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
  const [form, setForm] = useState({ title: "", description: "", priceUsdc: "", category: "Electronics", imageUrl: "", inStock: true });

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
    setForm({ title: "", description: "", priceUsdc: "", category: "Electronics", imageUrl: "", inStock: true });
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

      const body = {
        owner_wallet: wallet,
        title: form.title,
        description: form.description,
        price_usdc: price,
        category: form.category,
        image_url: form.imageUrl,
        in_stock: form.inStock,
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
    setForm({ title: p.title, description: p.description, priceUsdc: String(p.price_usdc), category: p.category, imageUrl: p.image_url, inStock: p.in_stock });
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
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{p.category} · ${p.price_usdc.toFixed(2)} USDC</div>
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
