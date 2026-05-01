'use client';

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const API = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8080";

interface DailyAnalytics {
  date: string;
  views: number;
  orders: number;
  revenue: number;
  visitors: number;
}

interface AnalyticsData {
  total_views: number;
  total_orders: number;
  total_revenue: number;
  total_visitors: number;
  daily: DailyAnalytics[];
}

export default function StoreAnalyticsPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const { publicKey } = useWallet();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/stores/${storeId}/analytics?days=${days}`);
      if (res.ok) setData(await res.json());
    } catch { /* offline */ }
    finally { setLoading(false); }
  }, [storeId, days]);

  useEffect(() => { load(); }, [load]);

  if (!publicKey) {
    return <div style={{ textAlign: "center", paddingTop: "4rem" }}><WalletMultiButton /></div>;
  }

  const stats = [
    { label: "Total Views", value: (data?.total_views ?? 0).toLocaleString(), color: "var(--cyan)" },
    { label: "Total Orders", value: (data?.total_orders ?? 0).toLocaleString(), color: "var(--violet)" },
    { label: "Total Revenue", value: `$${(data?.total_revenue ?? 0).toFixed(2)}`, color: "var(--green)" },
    { label: "Unique Visitors", value: (data?.total_visitors ?? 0).toLocaleString(), color: "var(--amber)" },
  ];

  const maxRevenue = data?.daily ? Math.max(...data.daily.map((d) => d.revenue), 1) : 1;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)" }}>Analytics</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)} style={{ padding: "0.35rem 0.75rem", borderRadius: "var(--radius-pill)", border: days === d ? "1px solid var(--cyan)" : "1px solid var(--border)", background: days === d ? "var(--cyan-dim)" : "transparent", color: days === d ? "var(--cyan)" : "var(--text-secondary)", fontSize: "0.8rem", cursor: "pointer" }}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        {stats.map((s) => (
          <div key={s.label} className="glass" style={{ padding: "1.25rem", borderRadius: "var(--radius-md)" }}>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.label}</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 900, color: s.color, marginTop: "0.35rem" }}>{loading ? "…" : s.value}</div>
          </div>
        ))}
      </div>

      {/* Revenue chart (simple bar) */}
      {data?.daily && data.daily.length > 0 && (
        <div className="glass" style={{ padding: "1.5rem", borderRadius: "var(--radius-lg)", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1.25rem" }}>Revenue Trend</h2>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 120 }}>
            {data.daily.slice().reverse().map((d) => (
              <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }} title={`${d.date}: $${d.revenue.toFixed(2)}`}>
                <div style={{ width: "100%", background: "var(--cyan)", borderRadius: "2px 2px 0 0", height: `${Math.max(4, (d.revenue / maxRevenue) * 100)}px`, minHeight: 4, transition: "height 0.3s" }} />
              </div>
            ))}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.5rem", textAlign: "center" }}>
            {data.daily[data.daily.length - 1]?.date ?? ""} → {data.daily[0]?.date ?? ""}
          </div>
        </div>
      )}

      {/* Data table */}
      <div className="glass" style={{ borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: "0.5rem", fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          <span>Date</span><span>Views</span><span>Visitors</span><span>Orders</span><span>Revenue</span>
        </div>
        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>Loading…</div>
        ) : !data?.daily?.length ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>No analytics data yet.</div>
        ) : (
          data.daily.map((d) => (
            <div key={d.date} style={{ padding: "0.75rem 1.25rem", borderBottom: "1px solid var(--border)", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: "0.5rem", fontSize: "0.82rem" }}>
              <span style={{ color: "var(--text-secondary)" }}>{d.date}</span>
              <span style={{ color: "var(--cyan)" }}>{d.views}</span>
              <span style={{ color: "var(--text-secondary)" }}>{d.visitors}</span>
              <span style={{ color: "var(--violet)" }}>{d.orders}</span>
              <span style={{ color: "var(--green)" }}>${d.revenue.toFixed(2)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
