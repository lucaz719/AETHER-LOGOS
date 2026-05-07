'use client';

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { BadgeCheck, Save, User, UserCheck } from "lucide-react";

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

const API = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8080";
const USER_TYPES = ["buyer", "vendor", "both"] as const;

async function hashEmail(email: string): Promise<string> {
  const encoded = new TextEncoder().encode(email.toLowerCase().trim());
  const data = new Uint8Array(encoded);
  const buf = await crypto.subtle.digest("SHA-256", data.buffer);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function UserProfilePage() {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() ?? "";

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const [form, setForm] = useState({ username: "", bio: "", userType: "buyer", preferredCurrency: "USDC", email: "" });

  useEffect(() => {
    if (!wallet) { setLoading(false); return; }
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/users/${wallet}`);
        if (res.ok) {
          const u: UserProfile = await res.json();
          setUser(u);
          setForm({ username: u.username, bio: u.bio, userType: u.user_type, preferredCurrency: u.preferred_currency, email: "" });
        }
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
      setMsg({ tone: "success", text: "Global Profile synchronization complete." });
      setTimeout(() => setMsg(null), 3000);
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : "Synchronization failed." });
    } finally { setSaving(false); }
  }, [wallet, form, user]);

  if (!publicKey) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="mb-6 rounded-full bg-primary/10 p-6 text-primary">
          <User size={48} />
        </div>
        <h2 className="text-2xl font-black text-foreground">Profile Locked</h2>
        <p className="mt-2 mb-8 max-w-sm text-muted-foreground">Connect your institutional wallet to access your global trade identity and reputation data.</p>
        <WalletMultiButton />
      </main>
    );
  }

  if (loading) return <div className="p-8 text-muted-foreground animate-pulse">Querying Identity Registry...</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Public Identity</h1>
          <p className="mt-1 text-muted-foreground">Manage how your entity appears to verified vendors and risk desks.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Reputation Score</p>
            <p className="text-xl font-black text-primary">{user?.reputation_score?.toFixed(1) ?? "0.0"}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <BadgeCheck size={24} />
          </div>
        </div>
      </header>

      {msg && (
        <div className={`flex items-center gap-3 p-4 rounded-2xl border ${
          msg.tone === "success" ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/10 border-red-500/20 text-red-500"
        }`}>
          <UserCheck size={18} />
          <span className="text-sm font-bold">{msg.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="grid gap-6">
        <section className="glass rounded-3xl p-8 space-y-6">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-muted-foreground mb-4">
            <User size={14} />
            Entity Profile
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="form-group">
              <label className="form-label">Display Name</label>
              <input 
                className="form-input" 
                placeholder="Institutional Entity Name" 
                value={form.username} 
                onChange={(e) => setForm({ ...form, username: e.target.value })} 
                maxLength={32} 
              />
              <p className="form-hint">Used for public ledgers and contract signatures.</p>
            </div>
            <div className="form-group">
              <label className="form-label">Classification</label>
              <select 
                className="form-input" 
                value={form.userType} 
                onChange={(e) => setForm({ ...form, userType: e.target.value })}
              >
                {USER_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
              <p className="form-hint">Determines your available market desk modes.</p>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Operational Bio</label>
            <textarea 
              className="form-input min-h-[100px] resize-none" 
              placeholder="Primary sectors, operational regions, and trade requirements..." 
              value={form.bio} 
              onChange={(e) => setForm({ ...form, bio: e.target.value })} 
              maxLength={256} 
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="form-group">
              <label className="form-label">Settlement Currency</label>
              <select 
                className="form-input" 
                value={form.preferredCurrency} 
                onChange={(e) => setForm({ ...form, preferredCurrency: e.target.value })}
              >
                {["USDC", "SOL", "USD"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Private Contact Hash</label>
              <input 
                type="email" 
                className="form-input" 
                placeholder="your@verified-entity.com" 
                value={form.email} 
                onChange={(e) => setForm({ ...form, email: e.target.value })} 
              />
              <p className="form-hint">Hashed on-chain for privacy-preserving notifications.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-border/50">
            <button 
              type="submit" 
              className="btn-primary gap-2" 
              disabled={saving}
            >
              <Save size={16} />
              {saving ? "Synchronizing..." : "Synchronize Identity"}
            </button>
          </div>
        </section>

        <section className="glass rounded-3xl p-8 bg-muted/30">
          <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4">Cryptographic Identity</h2>
          <div className="flex flex-col gap-2">
            <label className="form-label">Master Wallet Address</label>
            <code className="block w-full p-4 rounded-2xl bg-background border border-border text-xs text-primary break-all font-mono">
              {wallet}
            </code>
            <p className="form-hint">This address serves as the root of your trust score and escrow interactions.</p>
          </div>
        </section>
      </form>
    </div>
  );
}
