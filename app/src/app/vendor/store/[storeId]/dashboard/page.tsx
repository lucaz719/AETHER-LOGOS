'use client';

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";
import { FileText, Package, Settings, Tag } from "lucide-react";

const API = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8080";

interface Store {
  id: number;
  store_name: string;
  description: string;
  store_type: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

interface Analytics {
  total_views: number;
  total_orders: number;
  total_revenue: number;
  total_visitors: number;
  daily: Array<{ date: string; views: number; orders: number; revenue: number }>;
}

export default function StoreDashboardPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const { publicKey } = useWallet();
  const [store, setStore] = useState<Store | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [sRes, aRes] = await Promise.all([
        fetch(`${API}/api/stores/${storeId}`),
        fetch(`${API}/api/stores/${storeId}/analytics?days=30`),
      ]);
      if (sRes.ok) setStore(await sRes.json());
      if (aRes.ok) setAnalytics(await aRes.json());
    } catch { /* offline */ }
    finally { setLoading(false); }
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  if (!publicKey) {
    return (
      <div style={{ textAlign: "center", paddingTop: "4rem" }}>
        <WalletMultiButton />
      </div>
    );
  }

  if (loading) return <div style={{ color: "var(--text-muted)", padding: "2rem" }}>Loading…</div>;

  const stats = [
    { label: "Views (30d)", value: (analytics?.total_views ?? 0).toLocaleString(), color: "var(--cyan)" },
    { label: "Orders (30d)", value: (analytics?.total_orders ?? 0).toLocaleString(), color: "var(--violet)" },
    { label: "Revenue (30d)", value: `$${(analytics?.total_revenue ?? 0).toFixed(2)}`, color: "var(--green)" },
    { label: "Visitors (30d)", value: (analytics?.total_visitors ?? 0).toLocaleString(), color: "var(--amber)" },
  ];

  const quickLinks = [
    { href: `/vendor/store/${storeId}/products`, label: "Manage Products", icon: Package },
    { href: `/vendor/store/${storeId}/orders`, label: "View Orders", icon: FileText },
    { href: `/vendor/store/${storeId}/promotions`, label: "Create Promo", icon: Tag },
    { href: `/vendor/store/${storeId}/settings`, label: "Store Settings", icon: Settings },
  ];

  return (
    <div>
      {/* Store header */}
      <div className="glass" style={{ padding: "1.5rem", borderRadius: "var(--radius-lg)", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)" }}>{store?.store_name ?? "Store"}</h1>
            <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>{store?.description}</div>
          </div>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {store?.is_verified && <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem", borderRadius: "var(--radius-pill)", background: "var(--green-dim)", color: "var(--green)", border: "1px solid rgba(16,185,129,0.2)" }}>✓ Verified</span>}
            <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem", borderRadius: "var(--radius-pill)", background: store?.is_active ? "var(--cyan-dim)" : "rgba(255,255,255,0.04)", color: store?.is_active ? "var(--cyan)" : "var(--text-muted)", border: "1px solid var(--border)" }}>
              {store?.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        {stats.map((s) => (
          <div key={s.label} className="glass" style={{ padding: "1.25rem", borderRadius: "var(--radius-md)" }}>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.label}</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 900, color: s.color, marginTop: "0.3rem" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.75rem" }}>Quick Actions</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {quickLinks.map((q) => (
          <Link key={q.href} href={q.href} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1rem 1.25rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "var(--bg-surface)", textDecoration: "none", transition: "all var(--transition)" }}>
            <q.icon size={20} color="var(--text-secondary)" />
            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>{q.label}</span>
          </Link>
        ))}
      </div>

      {/* Recent daily stats */}
      {analytics?.daily && analytics.daily.length > 0 && (
        <div className="glass" style={{ padding: "1.25rem", borderRadius: "var(--radius-lg)" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>Recent Activity</h2>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {analytics.daily.slice(0, 7).map((d) => (
              <div key={d.date} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.5rem", padding: "0.5rem 0", borderBottom: "1px solid var(--border)", fontSize: "0.82rem" }}>
                <span style={{ color: "var(--text-muted)" }}>{d.date}</span>
                <span style={{ color: "var(--cyan)" }}>{d.views} views</span>
                <span style={{ color: "var(--violet)" }}>{d.orders} orders</span>
                <span style={{ color: "var(--green)" }}>${d.revenue.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <Link href={`/vendor/store/${storeId}/analytics`} style={{ display: "inline-block", marginTop: "0.75rem", fontSize: "0.82rem", color: "var(--cyan)", textDecoration: "none" }}>
            View full analytics →
          </Link>
        </div>
      )}
    </div>
  );
}
