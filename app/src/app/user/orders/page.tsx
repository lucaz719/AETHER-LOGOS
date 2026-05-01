'use client';

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8080";

const STATUS_COLORS: Record<string, string> = {
  Created: "var(--text-muted)",
  EscrowLocked: "var(--amber)",
  Shipped: "var(--cyan)",
  Delivered: "var(--green)",
  Cancelled: "var(--red)",
};

interface Order {
  pubkey: string;
  account: {
    buyer: string;
    seller: string;
    total_amount: string | number;
    quantity?: string | number;
    status: Record<string, unknown>;
    created_at?: string;
  };
}

export default function UserOrdersPage() {
  const { publicKey } = useWallet();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");

  useEffect(() => {
    if (!publicKey) { setLoading(false); return; }
    // Orders come from the on-chain marketplace program via the buyer dashboard
    // For now we use the existing buyer dashboard API route
    const load = async () => {
      try {
        const res = await fetch(`/api/marketplace/orders?buyer=${publicKey.toBase58()}`);
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders ?? []);
        }
      } catch { /* offline */ }
      finally { setLoading(false); }
    };
    load();
  }, [publicKey]);

  if (!publicKey) {
    return (
      <main style={{ textAlign: "center", paddingTop: "4rem" }}>
        <h2 style={{ color: "var(--text-primary)", marginBottom: "0.5rem" }}>My Orders</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>Connect your wallet to view your orders.</p>
        <WalletMultiButton />
      </main>
    );
  }

  const allStatuses = Array.from(new Set(orders.map((o) => Object.keys(o.account.status as Record<string, unknown>)[0] ?? "Unknown")));
  const visible = filter ? orders.filter((o) => (Object.keys(o.account.status as Record<string, unknown>)[0] ?? "") === filter) : orders;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)" }}>My Orders</h1>
        <Link href="/marketplace" className="btn-primary" style={{ textDecoration: "none", fontSize: "0.85rem" }}>+ Shop More</Link>
      </div>

      {/* Filters */}
      {allStatuses.length > 0 && (
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
          <button onClick={() => setFilter("")} style={{ padding: "0.3rem 0.75rem", borderRadius: "var(--radius-pill)", border: !filter ? "1px solid var(--cyan)" : "1px solid var(--border)", background: !filter ? "var(--cyan-dim)" : "transparent", color: !filter ? "var(--cyan)" : "var(--text-secondary)", fontSize: "0.8rem", cursor: "pointer" }}>All</button>
          {allStatuses.map((s) => (
            <button key={s} onClick={() => setFilter(s)} style={{ padding: "0.3rem 0.75rem", borderRadius: "var(--radius-pill)", border: filter === s ? "1px solid var(--cyan)" : "1px solid var(--border)", background: filter === s ? "var(--cyan-dim)" : "transparent", color: filter === s ? "var(--cyan)" : "var(--text-secondary)", fontSize: "0.8rem", cursor: "pointer" }}>{s}</button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ color: "var(--text-muted)", padding: "2rem" }}>Loading orders…</div>
      ) : visible.length === 0 ? (
        <div className="glass" style={{ padding: "3rem", textAlign: "center", borderRadius: "var(--radius-lg)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>📦</div>
          <p style={{ color: "var(--text-muted)" }}>No orders yet.</p>
          <Link href="/marketplace" className="btn-primary" style={{ textDecoration: "none", display: "inline-block", marginTop: "1rem" }}>Browse Marketplace</Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {visible.map((o) => {
            const status = Object.keys(o.account.status as Record<string, unknown>)[0] ?? "Unknown";
            const amount = Number(o.account.total_amount ?? 0) / 1_000_000;
            const statusColor = STATUS_COLORS[status] ?? "var(--text-muted)";
            return (
              <div key={o.pubkey} className="glass" style={{ padding: "1.25rem", borderRadius: "var(--radius-md)", display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem", alignItems: "center" }}>
                <div>
                  <div style={{ fontFamily: "monospace", fontSize: "0.82rem", color: "var(--cyan)", marginBottom: "0.25rem" }}>
                    {o.pubkey.slice(0, 8)}…{o.pubkey.slice(-8)}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    Vendor: <span style={{ fontFamily: "monospace" }}>{o.account.seller?.toString?.()?.slice(0, 8) ?? "–"}…</span>
                  </div>
                  {o.account.quantity && (
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Qty: {String(o.account.quantity)}</div>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--green)", marginBottom: "0.3rem" }}>${amount.toFixed(2)}</div>
                  <span style={{ padding: "0.2rem 0.6rem", borderRadius: "var(--radius-pill)", fontSize: "0.75rem", fontWeight: 700, color: statusColor, background: `${statusColor}15`, border: `1px solid ${statusColor}30` }}>{status}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
