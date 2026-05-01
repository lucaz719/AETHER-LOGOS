'use client';

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

interface UserProfile {
  id: number;
  wallet_address: string;
  user_type: string;
  username: string;
  bio: string;
  profile_image_cid: string;
  preferred_currency: string;
  email_hash: string;
  kyc_status: string;
  reputation_score: number;
  created_at: string;
}

interface UserAddress {
  id: number;
  address_type: string;
  recipient_name: string;
  street: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  phone: string;
  is_default: boolean;
}

const API = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8080";
const USER_TYPES = ["buyer", "vendor", "both"] as const;

async function hashEmail(email: string): Promise<string> {
  const data = new TextEncoder().encode(email.toLowerCase().trim());
  const buf = await crypto.subtle.digest("SHA-256", data.buffer as ArrayBuffer);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function UserProfilePage() {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() ?? "";

  const [user, setUser] = useState<UserProfile | null>(null);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const [form, setForm] = useState({ username: "", bio: "", userType: "buyer", preferredCurrency: "USDC", email: "" });
  const [addrForm, setAddrForm] = useState({ addressType: "shipping", recipientName: "", street: "", city: "", stateProvince: "", postalCode: "", country: "", phone: "", isDefault: false });
  const [addingAddr, setAddingAddr] = useState(false);

  useEffect(() => {
    if (!wallet) { setLoading(false); return; }
    const load = async () => {
      try {
        const [uRes, aRes] = await Promise.all([
          fetch(`${API}/api/users/${wallet}`),
          fetch(`${API}/api/users/${wallet}/addresses`),
        ]);
        if (uRes.ok) {
          const u: UserProfile = await uRes.json();
          setUser(u);
          setForm({ username: u.username, bio: u.bio, userType: u.user_type, preferredCurrency: u.preferred_currency, email: "" });
        }
        if (aRes.ok) setAddresses(await aRes.json());
      } catch { /* offline */ }
      finally { setLoading(false); }
    };
    load();
  }, [wallet]);

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;
    setSaving(true);
    setMsg(null);
    try {
      const emailHash = form.email ? await hashEmail(form.email) : user?.email_hash ?? "";
      const body: Record<string, unknown> = {
        user_type: form.userType,
        username: form.username,
        bio: form.bio,
        preferred_currency: form.preferredCurrency,
        email_hash: emailHash,
      };
      const res = await fetch(`${API}/api/users/${wallet}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg({ tone: "success", text: "Profile saved." });
      setTimeout(() => setMsg(null), 3000);
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : "Error saving profile." });
    } finally { setSaving(false); }
  }, [wallet, form, user]);

  const handleAddAddress = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;
    setAddingAddr(true);
    try {
      const res = await fetch(`${API}/api/users/${wallet}/addresses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address_type: addrForm.addressType,
          recipient_name: addrForm.recipientName,
          street: addrForm.street,
          city: addrForm.city,
          state_province: addrForm.stateProvince,
          postal_code: addrForm.postalCode,
          country: addrForm.country,
          phone: addrForm.phone,
          is_default: addrForm.isDefault,
        }),
      });
      if (res.ok) {
        const aRes = await fetch(`${API}/api/users/${wallet}/addresses`);
        if (aRes.ok) setAddresses(await aRes.json());
        setAddrForm({ addressType: "shipping", recipientName: "", street: "", city: "", stateProvince: "", postalCode: "", country: "", phone: "", isDefault: false });
        setMsg({ tone: "success", text: "Address added." });
        setTimeout(() => setMsg(null), 3000);
      }
    } catch { /* ignore */ }
    finally { setAddingAddr(false); }
  }, [wallet, addrForm]);

  const handleDeleteAddress = useCallback(async (id: number) => {
    if (!wallet) return;
    await fetch(`${API}/api/users/${wallet}/addresses/${id}`, { method: "DELETE" });
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  }, [wallet]);

  if (!publicKey) {
    return (
      <main style={{ textAlign: "center", paddingTop: "4rem" }}>
        <h2 style={{ color: "var(--text-primary)", marginBottom: "0.5rem" }}>Profile</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>Connect your wallet to manage your profile.</p>
        <WalletMultiButton />
      </main>
    );
  }

  if (loading) return <div style={{ color: "var(--text-muted)", padding: "2rem" }}>Loading…</div>;

  const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box" };

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "1.5rem" }}>Edit Profile</h1>

      {msg && (
        <div style={{ padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", marginBottom: "1rem", background: msg.tone === "success" ? "var(--green-dim)" : "rgba(239,68,68,0.1)", color: msg.tone === "success" ? "var(--green)" : "var(--red)", border: `1px solid ${msg.tone === "success" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`, fontSize: "0.875rem" }}>
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSave} className="glass" style={{ padding: "1.5rem", borderRadius: "var(--radius-lg)", display: "grid", gap: "1rem", marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Account Information</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Username</label>
            <input className="input" style={inputStyle} placeholder="e.g. trader_alice" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} maxLength={32} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Account Type</label>
            <select className="input" style={inputStyle} value={form.userType} onChange={(e) => setForm({ ...form, userType: e.target.value })}>
              {USER_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Bio</label>
          <textarea className="input" style={{ ...inputStyle, minHeight: 72, resize: "vertical" }} placeholder="Tell vendors and buyers about yourself…" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={256} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Preferred Currency</label>
            <select className="input" style={inputStyle} value={form.preferredCurrency} onChange={(e) => setForm({ ...form, preferredCurrency: e.target.value })}>
              {["USDC", "SOL", "USD"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Contact Email <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(hashed, optional)</span></label>
            <input type="email" className="input" style={inputStyle} placeholder="your@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Wallet Address</label>
          <div className="input addr" style={{ ...inputStyle, cursor: "default", opacity: 0.7 }}>{wallet}</div>
        </div>

        <button type="submit" className="btn-primary" disabled={saving} style={{ justifySelf: "start" }}>
          {saving ? "Saving…" : "Save Profile"}
        </button>
      </form>

      {/* Addresses */}
      <div className="glass" style={{ padding: "1.5rem", borderRadius: "var(--radius-lg)", marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>Saved Addresses ({addresses.length})</h2>

        {addresses.length > 0 && (
          <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1.25rem" }}>
            {addresses.map((addr) => (
              <div key={addr.id} style={{ padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "var(--bg-elevated)", display: "flex", justifyContent: "space-between", alignItems: "start", gap: "0.5rem" }}>
                <div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--cyan)", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                    {addr.address_type} {addr.is_default && <span style={{ color: "var(--green)", marginLeft: 4 }}>✓ Default</span>}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-primary)" }}>{addr.recipient_name}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{[addr.street, addr.city, addr.state_province, addr.postal_code, addr.country].filter(Boolean).join(", ")}</div>
                  {addr.phone && <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{addr.phone}</div>}
                </div>
                <button className="btn-danger" style={{ fontSize: "0.78rem", padding: "0.3rem 0.65rem" }} onClick={() => handleDeleteAddress(addr.id)}>Remove</button>
              </div>
            ))}
          </div>
        )}

        <details>
          <summary style={{ cursor: "pointer", fontSize: "0.875rem", fontWeight: 600, color: "var(--cyan)", marginBottom: "1rem" }}>+ Add New Address</summary>
          <form onSubmit={handleAddAddress} style={{ display: "grid", gap: "0.75rem", marginTop: "0.75rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Type</label>
                <select className="input" style={inputStyle} value={addrForm.addressType} onChange={(e) => setAddrForm({ ...addrForm, addressType: e.target.value })}>
                  <option value="shipping">Shipping</option>
                  <option value="billing">Billing</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Recipient Name</label>
                <input className="input" style={inputStyle} placeholder="Full name" value={addrForm.recipientName} onChange={(e) => setAddrForm({ ...addrForm, recipientName: e.target.value })} />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Street Address</label>
              <input className="input" style={inputStyle} placeholder="123 Main St" value={addrForm.street} onChange={(e) => setAddrForm({ ...addrForm, street: e.target.value })} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
              {[
                { label: "City", key: "city" as const },
                { label: "State/Province", key: "stateProvince" as const },
                { label: "Postal Code", key: "postalCode" as const },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.25rem" }}>{label}</label>
                  <input className="input" style={inputStyle} value={addrForm[key]} onChange={(e) => setAddrForm({ ...addrForm, [key]: e.target.value })} />
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Country</label>
                <input className="input" style={inputStyle} placeholder="US" value={addrForm.country} onChange={(e) => setAddrForm({ ...addrForm, country: e.target.value })} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Phone</label>
                <input className="input" style={inputStyle} placeholder="+1 555 000 0000" value={addrForm.phone} onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })} />
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem", color: "var(--text-secondary)", cursor: "pointer" }}>
              <input type="checkbox" checked={addrForm.isDefault} onChange={(e) => setAddrForm({ ...addrForm, isDefault: e.target.checked })} />
              Set as default
            </label>
            <button type="submit" className="btn-primary" disabled={addingAddr} style={{ justifySelf: "start" }}>
              {addingAddr ? "Adding…" : "Add Address"}
            </button>
          </form>
        </details>
      </div>
    </div>
  );
}
