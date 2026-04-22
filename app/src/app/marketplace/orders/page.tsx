'use client';

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useMarketplaceOrders } from "@/hooks/useMarketplaceOrders";
import { OrderStatusStepper } from "@/components/OrderStatusStepper";
import Link from "next/link";

function shortKey(k: string) { return `${k.slice(0, 4)}…${k.slice(-4)}`; }

export default function BuyerOrdersPage() {
  const { publicKey } = useWallet();
  const { orders, loading } = useMarketplaceOrders("buyer", publicKey?.toBase58());

  if (!publicKey) {
    return (
      <main style={{ maxWidth: 700, margin: "0 auto", padding: "3rem 1rem", textAlign: "center" }}>
        <p>Connect your wallet to view orders.</p>
        <WalletMultiButton />
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0 }}>My Orders</h1>
        <Link href="/marketplace" style={{ color: "#64748b", textDecoration: "none", fontSize: "0.9rem" }}>← Marketplace</Link>
      </div>

      {loading ? (
        <p style={{ color: "#94a3b8" }}>Loading orders…</p>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
          <p>No orders yet.</p>
          <Link href="/marketplace" style={{ color: "#2563eb", textDecoration: "none" }}>Browse Marketplace →</Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {orders.map((o) => {
            const status = Object.keys(o.account.status as Record<string, unknown>)[0] ?? "Created";
            const tradeKey = typeof o.account.trade_account === "string" ? o.account.trade_account : "";
            return (
              <div key={o.pubkey} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "1rem", display: "grid", gap: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>Order {shortKey(o.pubkey)}</div>
                    <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                      {new Date(Number(o.account.created_at ?? 0) * 1000).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700 }}>
                    ${(Number(o.account.total_amount ?? 0) / 1_000_000).toFixed(2)} USDC
                  </div>
                </div>
                <OrderStatusStepper orderStatus={status} />
                {tradeKey && (
                  <div style={{ fontSize: "0.8rem" }}>
                    <span style={{ color: "#94a3b8" }}>Escrow: </span>
                    <Link href={`/dashboard/buyer`} style={{ color: "#2563eb", textDecoration: "none" }}>
                      {shortKey(tradeKey)}
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
