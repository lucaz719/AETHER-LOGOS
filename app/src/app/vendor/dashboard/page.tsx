'use client';

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useVendorProfile } from "@/hooks/useVendorProfile";
import { useMarketplaceOrders } from "@/hooks/useMarketplaceOrders";
import { VendorDashboardNav } from "@/components/VendorDashboardNav";
import { Skeleton } from "@/components/Skeleton";
import Link from "next/link";

export default function VendorDashboardPage() {
  const { publicKey } = useWallet();
  const { profile, loading: profileLoading } = useVendorProfile(publicKey?.toBase58());
  const { orders, loading: ordersLoading } = useMarketplaceOrders("vendor", publicKey?.toBase58());

  if (!publicKey) {
    return (
      <main className="page-container" style={{ textAlign: "center", paddingTop: "4rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔑</div>
        <h2 style={{ color: "var(--text-primary)", marginBottom: "0.5rem" }}>Vendor Dashboard</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>Connect your wallet to access your vendor dashboard.</p>
        <WalletMultiButton />
      </main>
    );
  }

  if (profileLoading) {
    return (
      <main className="page-container" style={{ display: "flex", gap: "2rem" }}>
        <div style={{ minWidth: 190 }}>
          <Skeleton height={200} />
        </div>
        <div style={{ flex: 1, display: "grid", gap: "1rem" }}>
          <Skeleton height={40} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
            <Skeleton height={80} />
            <Skeleton height={80} />
            <Skeleton height={80} />
          </div>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="page-container" style={{ display: "flex", gap: "2rem" }}>
        <VendorDashboardNav active="/vendor/dashboard" />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "1.5rem" }}>Vendor Dashboard</h1>
          <div
            className="glass"
            style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏪</div>
            <p style={{ marginBottom: "1.25rem" }}>You haven&apos;t registered a vendor shop yet.</p>
            <Link href="/vendor/register" className="btn-primary" style={{ textDecoration: "none" }}>
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

  const STATS = [
    { label: "Total Sales", value: `$${totalSales}`, sub: "USDC", color: "var(--cyan)" },
    { label: "Avg Rating", value: `${avgRating} ★`, sub: `${ratingCount} reviews`, color: "var(--amber)" },
    { label: "Pending Orders", value: String(pendingOrders.length), sub: "awaiting shipment", color: "var(--green)" },
  ];

  return (
    <main className="page-container" style={{ display: "flex", gap: "2rem" }}>
      <VendorDashboardNav active="/vendor/dashboard" />
      <div style={{ flex: 1 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
              {String(acc.shop_name ?? "")}
            </h1>
            <span
              className={Boolean(acc.is_verified) ? "badge badge-green" : "badge badge-amber"}
              style={{ marginTop: "0.4rem" }}
            >
              {Boolean(acc.is_verified) ? "✓ Verified" : "Pending Verification"}
            </span>
          </div>
          <Link href="/vendor/listings/new" className="btn-primary" style={{ textDecoration: "none" }}>
            + New Listing
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="glass"
              style={{ padding: "1.25rem" }}
            >
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{stat.label}</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: stat.color, marginTop: "0.3rem", letterSpacing: "-0.02em" }}>
                {stat.value}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Pending shipments */}
        {pendingOrders.length > 0 && (
          <div>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.75rem" }}>
              ⚡ Pending Shipments
            </h2>
            <div style={{ display: "grid", gap: "0.6rem" }}>
              {pendingOrders.slice(0, 5).map((o) => (
                <div
                  key={o.pubkey}
                  style={{
                    background: "rgba(245,158,11,0.06)",
                    border: "1px solid rgba(245,158,11,0.2)",
                    borderRadius: "var(--radius-md)",
                    padding: "0.85rem 1rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)" }}>
                      Order{" "}
                      <span className="addr">
                        {String(o.pubkey).slice(0, 8)}…
                      </span>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                      ${(Number(o.account.total_amount ?? 0) / 1_000_000).toFixed(2)} USDC · Qty {String(o.account.quantity ?? 1)}
                    </div>
                  </div>
                  <Link
                    href="/vendor/orders"
                    style={{
                      padding: "0.35rem 0.9rem",
                      background: "var(--amber)",
                      color: "#0a0f1a",
                      borderRadius: "var(--radius-sm)",
                      textDecoration: "none",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                    }}
                  >
                    Ship →
                  </Link>
                </div>
              ))}
              {pendingOrders.length > 5 && (
                <Link href="/vendor/orders" style={{ color: "var(--cyan)", textDecoration: "none", fontSize: "0.85rem" }}>
                  View all {pendingOrders.length} pending orders →
                </Link>
              )}
            </div>
          </div>
        )}

        {ordersLoading && pendingOrders.length === 0 && (
          <div style={{ display: "grid", gap: "0.6rem" }}>
            <Skeleton height={56} />
            <Skeleton height={56} />
          </div>
        )}
      </div>
    </main>
  );
}

