'use client';

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

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
  settings: string;
}

interface StoreMember {
  id: number;
  user_wallet: string;
  role: string;
  joined_at: string;
}

export default function StoreSettingsPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() ?? "";

  const [store, setStore] = useState<Store | null>(null);
  const [members, setMembers] = useState<StoreMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState({ storeName: "", description: "", storeType: "retail", categories: [] as string[], isActive: true });
  const [newMember, setNewMember] = useState({ wallet: "", role: "staff" });
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, mRes] = await Promise.all([
          fetch(`${API}/api/stores/${storeId}`),
          fetch(`${API}/api/stores/${storeId}/members`),
        ]);
        if (sRes.ok) {
          const s: Store = await sRes.json();
          setStore(s);
          setForm({
            storeName: s.store_name,
            description: s.description,
            storeType: s.store_type,
            categories: s.categories ? s.categories.split(",").filter(Boolean) : [],
            isActive: s.is_active,
          });
        }
        if (mRes.ok) {
          const data = await mRes.json();
          setMembers(data.members ?? []);
        }
      } catch { /* offline */ }
      finally { setLoading(false); }
    };
    load();
  }, [storeId]);

  const toggleCategory = (cat: string) => {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(cat) ? f.categories.filter((c) => c !== cat) : f.categories.length < 8 ? [...f.categories, cat] : f.categories,
    }));
  };

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`${API}/api/stores/${storeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_wallet: wallet,
          store_name: form.storeName,
          description: form.description,
          store_type: form.storeType,
          categories: form.categories.join(","),
          is_active: form.isActive,
          logo_cid: store?.settings ?? "",
          banner_cid: "",
          settings: store?.settings ?? "{}",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg({ tone: "success", text: "Store settings saved." });
      setTimeout(() => setMsg(null), 3000);
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : "Error saving." });
    } finally { setSaving(false); }
  }, [wallet, storeId, form, store]);

  const handleAddMember = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.wallet) return;
    setAddingMember(true);
    try {
      await fetch(`${API}/api/stores/${storeId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_wallet: newMember.wallet, role: newMember.role, invited_by: wallet }),
      });
      const mRes = await fetch(`${API}/api/stores/${storeId}/members`);
      if (mRes.ok) { const data = await mRes.json(); setMembers(data.members ?? []); }
      setNewMember({ wallet: "", role: "staff" });
    } catch { /* ignore */ }
    finally { setAddingMember(false); }
  }, [storeId, newMember, wallet]);

  const handleRemoveMember = useCallback(async (memberWallet: string) => {
    if (!confirm("Remove this team member?")) return;
    await fetch(`${API}/api/stores/${storeId}/members/${memberWallet}`, { method: "DELETE" });
    setMembers((prev) => prev.filter((m) => m.user_wallet !== memberWallet));
  }, [storeId]);

  if (!publicKey) {
    return <div style={{ textAlign: "center", paddingTop: "4rem" }}><WalletMultiButton /></div>;
  }
  if (loading) return <div style={{ color: "var(--text-muted)", padding: "2rem" }}>Loading…</div>;

  const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box" };

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "1.5rem" }}>Store Settings</h1>

      {msg && (
        <div style={{ padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", marginBottom: "1rem", background: msg.tone === "success" ? "var(--green-dim)" : "rgba(239,68,68,0.1)", color: msg.tone === "success" ? "var(--green)" : "var(--red)", border: `1px solid ${msg.tone === "success" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`, fontSize: "0.875rem" }}>
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: "grid", gap: "1.25rem", marginBottom: "2rem" }}>
        <div className="glass" style={{ padding: "1.5rem", borderRadius: "var(--radius-lg)" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>Store Information</h2>
          <div style={{ display: "grid", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Store Name</label>
                <input className="input" style={inputStyle} value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} maxLength={64} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Store Type</label>
                <select className="input" style={inputStyle} value={form.storeType} onChange={(e) => setForm({ ...form, storeType: e.target.value })}>
                  {STORE_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Description</label>
              <textarea className="input" style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={512} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Categories</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {CATEGORIES.map((cat) => (
                  <button key={cat} type="button" onClick={() => toggleCategory(cat)} style={{ padding: "0.3rem 0.75rem", borderRadius: "var(--radius-pill)", border: form.categories.includes(cat) ? "1px solid var(--cyan)" : "1px solid var(--border)", background: form.categories.includes(cat) ? "var(--cyan-dim)" : "transparent", color: form.categories.includes(cat) ? "var(--cyan)" : "var(--text-secondary)", fontSize: "0.8rem", cursor: "pointer" }}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)", cursor: "pointer" }}>
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Store is active (visible to buyers)
            </label>
          </div>
        </div>
        <button type="submit" className="btn-primary" disabled={saving} style={{ justifySelf: "start" }}>
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </form>

      {/* Team management */}
      <div className="glass" style={{ padding: "1.5rem", borderRadius: "var(--radius-lg)", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>Team ({members.length})</h2>
        {members.map((m) => (
          <div key={m.user_wallet} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontFamily: "monospace", fontSize: "0.82rem", color: "var(--text-primary)" }}>{m.user_wallet.slice(0, 12)}…{m.user_wallet.slice(-8)}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{m.role}</div>
            </div>
            {m.role !== "owner" && (
              <button className="btn-danger" style={{ fontSize: "0.78rem", padding: "0.3rem 0.65rem" }} onClick={() => handleRemoveMember(m.user_wallet)}>Remove</button>
            )}
          </div>
        ))}
        <form onSubmit={handleAddMember} style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", flexWrap: "wrap" }}>
          <input className="input" placeholder="Wallet address" value={newMember.wallet} onChange={(e) => setNewMember({ ...newMember, wallet: e.target.value })} style={{ flex: 1, minWidth: 200 }} />
          <select className="input" style={{ width: 120 }} value={newMember.role} onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}>
            <option value="manager">Manager</option>
            <option value="staff">Staff</option>
          </select>
          <button type="submit" className="btn-primary" disabled={addingMember}>
            {addingMember ? "Adding…" : "Add Member"}
          </button>
        </form>
      </div>
    </div>
  );
}
