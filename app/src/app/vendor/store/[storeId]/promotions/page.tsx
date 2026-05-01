'use client';

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const API = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8080";
const PROMO_TYPES = ["discount", "fixed_amount", "free_shipping", "bogo"] as const;

interface Promotion {
  id: number;
  code: string;
  promo_type: string;
  value: number;
  min_order: number;
  max_uses: number;
  uses_count: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  description: string;
  created_at: string;
}

export default function StorePromotionsPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const { publicKey } = useWallet();
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", promoType: "discount", value: "", minOrder: "", maxUses: "", startsAt: "", endsAt: "", description: "" });

  const loadPromos = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/stores/${storeId}/promotions`);
      if (res.ok) {
        const data = await res.json();
        setPromos(data.promotions ?? []);
      }
    } catch { /* offline */ }
    finally { setLoading(false); }
  }, [storeId]);

  useEffect(() => { loadPromos(); }, [loadPromos]);

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setError(null);
    try {
      const res = await fetch(`${API}/api/stores/${storeId}/promotions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          promo_type: form.promoType,
          value: parseFloat(form.value) || 0,
          min_order: parseFloat(form.minOrder) || 0,
          max_uses: parseInt(form.maxUses) || 0,
          starts_at: form.startsAt,
          ends_at: form.endsAt,
          description: form.description,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setShowForm(false);
      setForm({ code: "", promoType: "discount", value: "", minOrder: "", maxUses: "", startsAt: "", endsAt: "", description: "" });
      await loadPromos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating promotion.");
    } finally { setSubmitting(false); }
  }, [storeId, form, loadPromos]);

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm("Delete this promotion?")) return;
    await fetch(`${API}/api/stores/${storeId}/promotions/${id}`, { method: "DELETE" });
    setPromos((prev) => prev.filter((p) => p.id !== id));
  }, [storeId]);

  if (!publicKey) {
    return <div style={{ textAlign: "center", paddingTop: "4rem" }}><WalletMultiButton /></div>;
  }

  const formatPromoType = (t: string) => t.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)" }}>Promotions</h1>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ Create Promo"}
        </button>
      </div>

      {showForm && (
        <div className="glass" style={{ padding: "1.5rem", borderRadius: "var(--radius-lg)", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>New Promotion</h2>
          <form onSubmit={handleCreate} style={{ display: "grid", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Promo Code</label>
                <input className="input" style={inputStyle} placeholder="SAVE20" maxLength={32} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Type</label>
                <select className="input" style={inputStyle} value={form.promoType} onChange={(e) => setForm({ ...form, promoType: e.target.value })}>
                  {PROMO_TYPES.map((t) => <option key={t} value={t}>{formatPromoType(t)}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Value {form.promoType === "discount" ? "(%)" : "(USDC)"}</label>
                <input type="number" required min="0" step="0.01" className="input" style={inputStyle} placeholder={form.promoType === "discount" ? "20" : "5.00"} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Min. Order ($)</label>
                <input type="number" min="0" step="0.01" className="input" style={inputStyle} placeholder="0.00" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Max Uses (0 = unlimited)</label>
                <input type="number" min="0" className="input" style={inputStyle} placeholder="100" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Starts At</label>
                <input type="datetime-local" className="input" style={inputStyle} value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Ends At</label>
                <input type="datetime-local" className="input" style={inputStyle} value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Description</label>
              <input className="input" style={inputStyle} placeholder="20% off all Electronics…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={128} />
            </div>
            {error && <div style={{ color: "var(--red)", fontSize: "0.82rem", padding: "0.6rem", background: "rgba(239,68,68,0.08)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(239,68,68,0.2)" }}>{error}</div>}
            <button type="submit" className="btn-primary" disabled={submitting} style={{ justifySelf: "start" }}>
              {submitting ? "Creating…" : "Create Promotion"}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ color: "var(--text-muted)", padding: "2rem" }}>Loading promotions…</div>
      ) : promos.length === 0 ? (
        <div className="glass" style={{ padding: "3rem", textAlign: "center", borderRadius: "var(--radius-lg)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>🏷</div>
          <h3 style={{ color: "var(--text-primary)", marginBottom: "0.5rem" }}>No promotions yet</h3>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Create discount codes and flash sales to boost your store.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {promos.map((p) => {
            const now = new Date();
            const starts = p.starts_at ? new Date(p.starts_at) : null;
            const ends = p.ends_at ? new Date(p.ends_at) : null;
            const isLive = p.is_active && (!starts || starts <= now) && (!ends || ends >= now);
            return (
              <div key={p.id} className="glass" style={{ padding: "1.25rem", borderRadius: "var(--radius-md)", display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: "1rem", alignItems: "center" }}>
                {p.code ? (
                  <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: "1rem", color: "var(--cyan)", padding: "0.3rem 0.75rem", background: "var(--cyan-dim)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: "var(--radius-sm)" }}>{p.code}</div>
                ) : (
                  <div style={{ width: 40 }} />
                )}
                <div>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.875rem" }}>
                    {formatPromoType(p.promo_type)}: {p.promo_type === "discount" ? `${p.value}%` : `$${p.value}`} off
                    {p.min_order > 0 && ` (min $${p.min_order})`}
                  </div>
                  {p.description && <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>{p.description}</div>}
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    Uses: {p.uses_count}{p.max_uses > 0 ? ` / ${p.max_uses}` : ""}
                    {p.ends_at && ` · Expires ${new Date(p.ends_at).toLocaleDateString()}`}
                  </div>
                </div>
                <span style={{ padding: "0.2rem 0.6rem", borderRadius: "var(--radius-pill)", fontSize: "0.72rem", fontWeight: 700, color: isLive ? "var(--green)" : "var(--text-muted)", background: isLive ? "var(--green-dim)" : "rgba(255,255,255,0.04)", border: `1px solid ${isLive ? "rgba(16,185,129,0.2)" : "var(--border)"}` }}>
                  {isLive ? "Live" : "Inactive"}
                </span>
                <button className="btn-danger" style={{ fontSize: "0.78rem", padding: "0.3rem 0.65rem" }} onClick={() => handleDelete(p.id)}>Delete</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
