'use client';

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

interface Preferences {
  theme: string;
  language: string;
  currency: string;
  email_notifications: boolean;
  push_notifications: boolean;
  two_factor_enabled: boolean;
}

const API = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8080";

export default function UserSettingsPage() {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() ?? "";

  const [prefs, setPrefs] = useState<Preferences>({
    theme: "dark", language: "en", currency: "USDC",
    email_notifications: true, push_notifications: false, two_factor_enabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!wallet) { setLoading(false); return; }
    fetch(`${API}/api/users/${wallet}/preferences`)
      .then((r) => r.ok ? r.json() : null)
      .then((p) => { if (p) setPrefs(p); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [wallet]);

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`${API}/api/users/${wallet}/preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg({ tone: "success", text: "Settings saved." });
      setTimeout(() => setMsg(null), 3000);
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : "Error saving." });
    } finally { setSaving(false); }
  }, [wallet, prefs]);

  const handleDeleteAccount = useCallback(async () => {
    if (!wallet || !confirm("Delete your account? This cannot be undone.")) return;
    try {
      await fetch(`${API}/api/users/${wallet}`, { method: "DELETE" });
      alert("Account deleted.");
    } catch { /* ignore */ }
  }, [wallet]);

  if (!publicKey) {
    return (
      <main style={{ textAlign: "center", paddingTop: "4rem" }}>
        <h2 style={{ color: "var(--text-primary)", marginBottom: "0.5rem" }}>Settings</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>Connect your wallet to manage settings.</p>
        <WalletMultiButton />
      </main>
    );
  }

  if (loading) return <div style={{ color: "var(--text-muted)", padding: "2rem" }}>Loading…</div>;

  const toggleStyle = (on: boolean): React.CSSProperties => ({
    display: "inline-flex", width: 40, height: 22, borderRadius: 11,
    background: on ? "var(--cyan)" : "var(--bg-elevated)",
    border: `1px solid ${on ? "var(--cyan)" : "var(--border)"}`,
    cursor: "pointer", transition: "all var(--transition)", alignItems: "center",
    padding: "0 3px",
  });

  const thumbStyle = (on: boolean): React.CSSProperties => ({
    width: 16, height: 16, borderRadius: "50%",
    background: on ? "#fff" : "var(--text-muted)",
    transform: on ? "translateX(18px)" : "translateX(0)",
    transition: "transform var(--transition)",
  });

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "1.5rem" }}>Settings</h1>

      {msg && (
        <div style={{ padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", marginBottom: "1rem", background: msg.tone === "success" ? "var(--green-dim)" : "rgba(239,68,68,0.1)", color: msg.tone === "success" ? "var(--green)" : "var(--red)", border: `1px solid ${msg.tone === "success" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`, fontSize: "0.875rem" }}>
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: "grid", gap: "1.25rem" }}>
        {/* Appearance */}
        <div className="glass" style={{ padding: "1.5rem", borderRadius: "var(--radius-lg)" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>Appearance</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Theme</label>
              <select className="input" style={{ width: "100%" }} value={prefs.theme} onChange={(e) => setPrefs({ ...prefs, theme: e.target.value })}>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Language</label>
              <select className="input" style={{ width: "100%" }} value={prefs.language} onChange={(e) => setPrefs({ ...prefs, language: e.target.value })}>
                <option value="en">English</option>
                <option value="zh">中文</option>
                <option value="es">Español</option>
                <option value="ar">العربية</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Display Currency</label>
              <select className="input" style={{ width: "100%" }} value={prefs.currency} onChange={(e) => setPrefs({ ...prefs, currency: e.target.value })}>
                {["USDC", "SOL", "USD", "EUR", "GBP"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="glass" style={{ padding: "1.5rem", borderRadius: "var(--radius-lg)" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>Notifications</h2>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {([
              { key: "email_notifications" as const, label: "Email Notifications", desc: "Order updates and promotions" },
              { key: "push_notifications" as const, label: "Push Notifications", desc: "Real-time alerts in browser" },
            ] as const).map(({ key, label, desc }) => (
              <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>{label}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{desc}</div>
                </div>
                <button type="button" style={toggleStyle(prefs[key])} onClick={() => setPrefs({ ...prefs, [key]: !prefs[key] })}>
                  <span style={thumbStyle(prefs[key])} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="glass" style={{ padding: "1.5rem", borderRadius: "var(--radius-lg)" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>Security</h2>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>Two-Factor Authentication</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Extra confirmation for sensitive actions</div>
            </div>
            <button type="button" style={toggleStyle(prefs.two_factor_enabled)} onClick={() => setPrefs({ ...prefs, two_factor_enabled: !prefs.two_factor_enabled })}>
              <span style={thumbStyle(prefs.two_factor_enabled)} />
            </button>
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={saving} style={{ justifySelf: "start" }}>
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </form>

      {/* Danger zone */}
      <div style={{ marginTop: "2rem", padding: "1.5rem", borderRadius: "var(--radius-lg)", border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.04)" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--red)", marginBottom: "0.75rem" }}>Danger Zone</h2>
        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1rem" }}>Deleting your account removes your profile and preferences. Your on-chain activity is unaffected.</p>
        <button className="btn-danger" onClick={handleDeleteAccount}>Delete Account</button>
      </div>
    </div>
  );
}
