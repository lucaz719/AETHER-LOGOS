import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { CategoryNav } from "@/components/CategoryNav";

export const metadata = { title: "Marketplace | AETHER-LOGOS" };

export default function MarketplacePage() {
  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1rem" }}>
      <section style={{ textAlign: "center", padding: "2rem 0 3rem" }}>
        <h1 style={{ fontSize: "2rem", margin: "0 0 0.5rem" }}>AETHER-LOGOS Marketplace</h1>
        <p style={{ color: "#64748b", margin: "0 0 1.5rem" }}>
          Discover verified vendors. Every order is secured by the on-chain escrow vault.
        </p>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <SearchBar />
        </div>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <CategoryNav />
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "2rem" }}>
        <aside>
          <div style={{ fontWeight: 600, marginBottom: "0.75rem" }}>Quick Links</div>
          <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <Link href="/marketplace/search?type=Retailer" style={{ color: "#2563eb", textDecoration: "none", fontSize: "0.9rem" }}>🛍️ Retailers</Link>
            <Link href="/marketplace/search?type=Wholesaler" style={{ color: "#7c3aed", textDecoration: "none", fontSize: "0.9rem" }}>📦 Wholesalers</Link>
            <Link href="/marketplace/search?type=Distributor" style={{ color: "#0891b2", textDecoration: "none", fontSize: "0.9rem" }}>🚢 Distributors</Link>
            <Link href="/marketplace/search?type=Manufacturer" style={{ color: "#b45309", textDecoration: "none", fontSize: "0.9rem" }}>🏭 Manufacturers</Link>
          </nav>

          <div style={{ fontWeight: 600, margin: "1.5rem 0 0.75rem" }}>Sell on Marketplace</div>
          <Link
            href="/vendor/register"
            style={{
              display: "block",
              padding: "0.6rem 1rem",
              background: "#1e293b",
              color: "#fff",
              borderRadius: 8,
              textDecoration: "none",
              fontSize: "0.85rem",
              textAlign: "center",
            }}
          >
            Register as Vendor
          </Link>
        </aside>

        <div>
          <div
            style={{
              border: "1px dashed #e2e8f0",
              borderRadius: 12,
              padding: "3rem",
              textAlign: "center",
              color: "#94a3b8",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏪</div>
            <p style={{ margin: "0 0 1rem" }}>Browse categories or use search to discover products and vendors.</p>
            <p style={{ margin: 0, fontSize: "0.85rem" }}>
              All listings are backed by Solana on-chain accounts.{" "}
              <Link href="/marketplace/search" style={{ color: "#2563eb" }}>View all listings →</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
