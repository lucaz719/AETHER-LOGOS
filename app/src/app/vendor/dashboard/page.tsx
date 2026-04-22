'use client';

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useVendorProfile } from "@/hooks/useVendorProfile";
import { useMarketplaceOrders } from "@/hooks/useMarketplaceOrders";
import { VendorDashboardNav } from "@/components/VendorDashboardNav";
import Link from "next/link";

export default function VendorDashboardPage() {
  const { publicKey } = useWallet();
  const { profile } = useVendorProfile(publicKey?.toBase58());
  const { orders } = useMarketplaceOrders("vendor", publicKey?.toBase58());

  if (!publicKey) {
    return (
      <main style={{ maxWidth: 700, margin: "0 auto", padding: "3rem 1rem", textAlign: "center" }}>
        <h1>Vendor Dashboard</h1>
        <p>Connect your wallet to access your vendor dashboard.</p>
        <WalletMultiButton />
      </main>
    );
  }

  if (!profile) {
    return (
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1rem", display: "flex", gap: "2rem" }}>
        <VendorDashboardNav active="/vendor/dashboard" />
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: "0 0 1rem" }}>Vendor Dashboard</h1>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "2rem", textAlign: "center" }}>
            <p>You haven&apos;t registered a vendor shop yet.</p>
            <Link href="/vendor/register" style={{ padding: "0.6rem 1.2rem", background: "#1e293b", color: "#fff", borderRadius: 8, textDecoration: "none" }}>
              Register as Vendor
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const acc = profile.account;
  const ratingSum = Number(acc.rating_sum ?? 0);
  const ratingCount = Number(acc.rating_count ?? 0);
  const avgRating = ratingCount > 0 ? (ratingSum / ratingCount).toFixed(1) : "—";
  const totalSales = (Number(acc.total_sales ?? 0) / 1_000_000).toFixed(2);
  const pendingOrders = orders.filter((o) => {
    const s = Object.keys(o.account.status as Record<string, unknown>)[0];
    return s === "EscrowLocked";
  });

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "2rem 1rem", display: "flex", gap: "2rem" }}>
      <VendorDashboardNav active="/vendor/dashboard" />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem" }}>{String(acc.shop_name ?? "")}</h1>
            <span style={{ fontSize: "0.8rem", color: Boolean(acc.is_verified) ? "#16a34a" : "#94a3b8" }}>
              {Boolean(acc.is_verified) ? "✓ Verified" : "Pending verification"}
            </span>
          </div>
          <Link
            href="/vendor/listings/new"
            style={{ padding: "0.6rem 1.2rem", background: "#1e293b", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: "0.9rem" }}
          >
            + New Listing
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          {[
            { label: "Total Sales", value: `$${totalSales} USDC` },
            { label: "Avg Rating", value: `${avgRating} ★ (${ratingCount})` },
            { label: "Pending Orders", value: String(pendingOrders.length) },
          ].map((stat) => (
            <div key={stat.label} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "1.2rem" }}>
              <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{stat.label}</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 700, marginTop: "0.25rem" }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {pendingOrders.length > 0 && (
          <div>
            <h2 style={{ fontSize: "1.1rem", margin: "0 0 1rem" }}>Pending Shipments</h2>
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {pendingOrders.slice(0, 5).map((o) => (
                <div key={o.pubkey} style={{ border: "1px solid #fef3c7", background: "#fffbeb", borderRadius: 8, padding: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Order {o.pubkey.slice(0, 8)}…</div>
                    <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                      ${(Number(o.account.total_amount ?? 0) / 1_000_000).toFixed(2)} USDC · Qty {String(o.account.quantity ?? 1)}
                    </div>
                  </div>
                  <Link href="/vendor/orders" style={{ padding: "0.4rem 0.9rem", background: "#f59e0b", color: "#fff", borderRadius: 6, textDecoration: "none", fontSize: "0.8rem" }}>
                    Ship
                  </Link>
                </div>
              ))}
              {pendingOrders.length > 5 && (
                <Link href="/vendor/orders" style={{ color: "#2563eb", textDecoration: "none", fontSize: "0.85rem" }}>
                  View all {pendingOrders.length} pending orders →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
