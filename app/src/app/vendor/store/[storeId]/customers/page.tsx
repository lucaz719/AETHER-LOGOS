'use client';

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function StoreCustomersPage() {
  const { publicKey } = useWallet();

  if (!publicKey) {
    return <div style={{ textAlign: "center", paddingTop: "4rem" }}><WalletMultiButton /></div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)" }}>Customers</h1>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Total Customers", value: "–", color: "var(--cyan)" },
          { label: "Returning", value: "–", color: "var(--green)" },
          { label: "Avg. Order Value", value: "–", color: "var(--amber)" },
        ].map((s) => (
          <div key={s.label} className="glass" style={{ padding: "1.25rem", borderRadius: "var(--radius-md)" }}>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.label}</div>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: s.color, marginTop: "0.35rem" }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="glass" style={{ padding: "3rem", textAlign: "center", borderRadius: "var(--radius-lg)" }}>
        <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>👥</div>
        <h3 style={{ color: "var(--text-primary)", marginBottom: "0.5rem" }}>Customer data available after first orders</h3>
        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
          Once buyers purchase from your store, their anonymized wallet data will appear here.
          Customer lifetime value and purchase history are tracked automatically.
        </p>
      </div>
    </div>
  );
}
