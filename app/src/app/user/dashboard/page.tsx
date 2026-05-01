'use client';

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";

interface UserProfile {
  id: number;
  wallet_address: string;
  user_type: string;
  username: string;
  reputation_score: number;
  kyc_status: string;
  created_at: string;
}

const API = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8080";

export default function UserDashboardPage() {
  const { publicKey } = useWallet();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const wallet = publicKey?.toBase58();

  useEffect(() => {
    if (!wallet) { setLoading(false); return; }
    const init = async () => {
      try {
        // Upsert user on login
        await fetch(`${API}/api/users/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet_address: wallet, user_type: "buyer" }),
        });
        const res = await fetch(`${API}/api/users/${wallet}`);
        if (res.ok) setUser(await res.json());
      } catch { /* offline */ }
      finally { setLoading(false); }
    };
    init();
  }, [wallet]);

  if (!publicKey) {
    return (
      <main style={{ textAlign: "center", paddingTop: "4rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>◉</div>
        <h2 style={{ color: "var(--text-primary)", marginBottom: "0.5rem" }}>My Account</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>Connect your wallet to access your account.</p>
        <WalletMultiButton />
      </main>
    );
  }

  if (loading) {
    return <div style={{ color: "var(--text-muted)", padding: "2rem" }}>Loading…</div>;
  }

  const quickActions = [
    { href: "/user/orders", label: "View Orders", icon: "📦", color: "var(--cyan)" },
    { href: "/user/wallet", label: "Wallet", icon: "◈", color: "var(--violet)" },
    { href: "/marketplace", label: "Shop Now", icon: "🛍", color: "var(--green)" },
    { href: "/vendor/stores", label: "My Stores", icon: "🏪", color: "var(--amber)" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="glass" style={{ padding: "1.5rem", borderRadius: "var(--radius-lg)", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--cyan-dim)", border: "2px solid var(--cyan)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem" }}>
            ◉
          </div>
          <div>
            <h1 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {user?.username || "Anonymous"}
            </h1>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "monospace", marginTop: "0.2rem" }}>
              {wallet?.slice(0, 8)}…{wallet?.slice(-8)}
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
            <span style={{ padding: "0.25rem 0.65rem", background: "var(--cyan-dim)", color: "var(--cyan)", borderRadius: "var(--radius-pill)", fontSize: "0.75rem", fontWeight: 600, border: "1px solid rgba(0,212,255,0.2)" }}>
              {user?.user_type ?? "buyer"}
            </span>
            <span style={{ padding: "0.25rem 0.65rem", background: user?.kyc_status === "verified" ? "var(--green-dim)" : "rgba(255,255,255,0.05)", color: user?.kyc_status === "verified" ? "var(--green)" : "var(--text-muted)", borderRadius: "var(--radius-pill)", fontSize: "0.75rem", fontWeight: 600, border: `1px solid ${user?.kyc_status === "verified" ? "rgba(16,185,129,0.2)" : "var(--border)"}` }}>
              KYC: {user?.kyc_status ?? "none"}
            </span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Reputation", value: user?.reputation_score?.toFixed(1) ?? "0.0", color: "var(--amber)" },
          { label: "Member Since", value: user?.created_at ? new Date(user.created_at).getFullYear().toString() : "–", color: "var(--cyan)" },
        ].map((stat) => (
          <div key={stat.label} className="glass" style={{ padding: "1.25rem", borderRadius: "var(--radius-md)" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{stat.label}</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 900, color: stat.color, marginTop: "0.35rem" }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.75rem" }}>Quick Actions</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {quickActions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
              padding: "1.25rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              background: "var(--bg-surface)",
              textDecoration: "none",
              transition: "all var(--transition)",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: "1.6rem" }}>{a.icon}</span>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: a.color }}>{a.label}</span>
          </Link>
        ))}
      </div>

      {/* Edit link */}
      <Link href="/user/profile" className="btn-ghost" style={{ textDecoration: "none", fontSize: "0.85rem" }}>
        Edit Profile →
      </Link>
    </div>
  );
}
