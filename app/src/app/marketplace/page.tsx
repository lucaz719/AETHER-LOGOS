import Link from "next/link";
import { CategoryNav } from "@/components/CategoryNav";
import { ProductCard } from "@/components/ProductCard";
import { VendorCard } from "@/components/VendorCard";
import { EmptyState } from "@/components/EmptyState";
import { getCoder } from "@/lib/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import marketplaceIdl from "@/lib/idl/marketplace.json";

export const metadata = { title: "Marketplace | AETHER-LOGOS" };

export const revalidate = 30; // ISR: re-fetch at most every 30 seconds

const PROGRAM_ID =
  process.env.NEXT_PUBLIC_MARKETPLACE_PROGRAM_ID ?? "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnN";
const RPC =
  process.env.SOLANA_RPC_URL ??
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
  "https://api.devnet.solana.com";

async function fetchFeatured() {
  try {
    const connection = new Connection(RPC, "confirmed");
    const programKey = new PublicKey(PROGRAM_ID);
    const coder = getCoder(marketplaceIdl);

    const listingDisc = Buffer.from([12, 188, 195, 61, 183, 115, 249, 54]).toString("base64");
    const vendorDisc = Buffer.from([212, 127, 49, 14, 158, 116, 14, 66]).toString("base64");

    const [listingAccts, vendorAccts] = await Promise.all([
      connection.getProgramAccounts(programKey, {
        encoding: "base64",
        filters: [{ memcmp: { offset: 0, bytes: listingDisc, encoding: "base64" } }],
      }),
      connection.getProgramAccounts(programKey, {
        encoding: "base64",
        filters: [{ memcmp: { offset: 0, bytes: vendorDisc, encoding: "base64" } }],
      }),
    ]);

    const allListings = listingAccts
      .map((a) => {
        const raw = Array.isArray(a.account.data) ? a.account.data[0] : null;
        if (!raw) return null;
        try {
          const dec = coder.decode("ProductListing", Buffer.from(raw, "base64")) as Record<string, unknown>;
          if (!dec || !dec.is_active) return null;
          return { pubkey: a.pubkey.toBase58(), account: dec };
        } catch { return null; }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    // Featured: newest 8 listings
    const listings = allListings.slice(0, 8);

    // New arrivals: last 4 (in order of appearance from RPC)
    const newArrivals = allListings.slice(Math.max(0, allListings.length - 4));

    const vendors = vendorAccts
      .map((a) => {
        const raw = Array.isArray(a.account.data) ? a.account.data[0] : null;
        if (!raw) return null;
        try {
          const dec = coder.decode("VendorProfile", Buffer.from(raw, "base64")) as Record<string, unknown>;
          if (!dec || !dec.is_active) return null;
          return { pubkey: a.pubkey.toBase58(), account: dec };
        } catch { return null; }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => {
        const rA = Number(a.account.rating_count ?? 0) > 0
          ? Number(a.account.rating_sum ?? 0) / Number(a.account.rating_count)
          : 0;
        const rB = Number(b.account.rating_count ?? 0) > 0
          ? Number(b.account.rating_sum ?? 0) / Number(b.account.rating_count)
          : 0;
        return rB - rA;
      })
      .slice(0, 4);

    return {
      listings,
      newArrivals,
      vendors,
      stats: {
        totalListings: allListings.length,
        totalVendors: vendorAccts.length,
      },
    };
  } catch {
    return { listings: [], newArrivals: [], vendors: [], stats: { totalListings: 0, totalVendors: 0 } };
  }
}

function listingToCardProps(l: { pubkey: string; account: Record<string, unknown> }) {
  const category = Object.keys(l.account.category as Record<string, unknown>)[0] ?? "Other";
  const vendorKey =
    typeof l.account.vendor === "string"
      ? l.account.vendor
      : (l.account.vendor as { toBase58?: () => string })?.toBase58?.() ?? "";
  return {
    pubkey: l.pubkey,
    title: String(l.account.title ?? ""),
    priceUsdc: Number(l.account.price_usdc ?? 0),
    minOrderQty: Number(l.account.min_order_qty ?? 1),
    maxOrderQty: l.account.max_order_qty ? Number(l.account.max_order_qty) : undefined,
    stockQuantity: l.account.quantity !== undefined ? Number(l.account.quantity) : undefined,
    vendorAuthority: vendorKey,
    category,
    imagesCid: l.account.images_cid as string | undefined,
    isActive: Boolean(l.account.is_active),
  };
}

export default async function MarketplacePage() {
  const { listings, newArrivals, vendors, stats } = await fetchFeatured();

  return (
    <main>
      {/* ── Hero ── */}
      <section className="hero-mesh hero-section" style={{ padding: "5rem 1.25rem 3.5rem", textAlign: "center" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          {/* Protocol badge */}
          <div
            style={{
              display: "inline-block",
              marginBottom: "1rem",
              padding: "0.25rem 0.9rem",
              borderRadius: "var(--radius-pill)",
              background: "var(--cyan-dim)",
              border: "1px solid var(--border-accent)",
              fontSize: "0.78rem",
              color: "var(--cyan)",
              fontWeight: 600,
              letterSpacing: "0.08em",
            }}
          >
            ⬡ SOLANA · ESCROW-SECURED · DECENTRALISED
          </div>

          <h1
            style={{
              fontSize: "clamp(2rem, 5vw, 3.2rem)",
              fontWeight: 800,
              lineHeight: 1.15,
              color: "var(--text-primary)",
              marginBottom: "1rem",
            }}
          >
            Trade anything,{" "}
            <span style={{ color: "var(--cyan)", textShadow: "0 0 24px rgba(0,212,255,0.4)" }}>
              trustlessly.
            </span>
          </h1>

          <p style={{ color: "var(--text-secondary)", fontSize: "1rem", marginBottom: "2.5rem", lineHeight: 1.7 }}>
            Every order is secured by the on-chain escrow vault.
            Funds are released only upon verified delivery.
          </p>

          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            {/* SearchBar moved to NavBar */}
          </div>
        </div>

        {/* ── Live stats bar ── */}
        {(stats.totalListings > 0 || stats.totalVendors > 0) && (
          <div
            className="stats-bar glass"
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "3rem",
              marginTop: "2.5rem",
              padding: "1.5rem",
              flexWrap: "wrap",
            }}
          >
            {[
              { value: stats.totalListings, label: "Active Listings", icon: "📋" },
              { value: stats.totalVendors, label: "Verified Vendors", icon: "🏪" },
              { value: "$12.4M", label: "TVL in Escrow", icon: "🔒" },
              { value: "100%", label: "Delivery Success", icon: "⚡" },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <span style={{ fontSize: "1.5rem" }}>{stat.icon}</span>
                <span
                  style={{
                    fontSize: "1.6rem",
                    fontWeight: 800,
                    color: "var(--cyan)",
                    textShadow: "0 0 16px rgba(0,212,255,0.3)",
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </span>
                <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", letterSpacing: "0.04em" }}>
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="page-container">
        {/* Category nav */}
        <section style={{ marginBottom: "2.5rem" }}>
          <CategoryNav />
        </section>

        {/* Featured Products */}
        <section style={{ marginBottom: "3rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>
              ⚡ Featured Products
            </h2>
            <Link href="/marketplace/search" style={{ fontSize: "0.82rem", color: "var(--cyan)", fontWeight: 600 }}>
              View all →
            </Link>
          </div>

          {listings.length === 0 ? (
            <EmptyState
              icon="🏪"
              title="No listings yet"
              message="Be the first to list a product on the AETHER-LOGOS marketplace."
              action={{ label: "Register as Vendor", href: "/vendor/register" }}
            />
          ) : (
            <div
              className="hide-scrollbar"
              style={{
                display: "flex",
                gap: "1.25rem",
                overflowX: "auto",
                paddingBottom: "1rem",
                scrollSnapType: "x mandatory",
              }}
            >
              {listings.map((l) => (
                <div key={l.pubkey} style={{ minWidth: "280px", maxWidth: "320px", scrollSnapAlign: "start", flexShrink: 0 }}>
                  <ProductCard {...listingToCardProps(l)} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* New Arrivals */}
        {newArrivals.length > 0 && (
          <section style={{ marginBottom: "3rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>
                🌟 New Arrivals
              </h2>
            </div>
            <div className="listing-grid">
              {newArrivals.map((l) => (
                <ProductCard key={l.pubkey} {...listingToCardProps(l)} />
              ))}
            </div>
          </section>
        )}

        {/* Top Vendors */}
        <section style={{ marginBottom: "3rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>
              🏆 Top Vendors
            </h2>
            <Link href="/marketplace/search?tab=vendors" style={{ fontSize: "0.82rem", color: "var(--cyan)", fontWeight: 600 }}>
              View all →
            </Link>
          </div>

          {vendors.length === 0 ? (
            <EmptyState icon="🏆" title="No vendors yet" message="Vendors will appear here once registered." />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
              {vendors.map((v) => {
                const acc = v.account;
                const vt = acc.vendor_type as Record<string, unknown>;
                const vendorType = vt ? (Object.keys(vt)[0] ?? "Other") : "Other";
                const auth =
                  typeof acc.authority === "string"
                    ? acc.authority
                    : (acc.authority as { toBase58?: () => string })?.toBase58?.() ?? "";
                return (
                  <VendorCard
                    key={v.pubkey}
                    authority={auth}
                    shopName={String(acc.shop_name ?? "")}
                    shopDescription={String(acc.shop_description ?? "")}
                    vendorType={vendorType.charAt(0).toUpperCase() + vendorType.slice(1)}
                    isVerified={Boolean(acc.is_verified)}
                    ratingSum={Number(acc.rating_sum ?? 0)}
                    ratingCount={Number(acc.rating_count ?? 0)}
                    totalSales={Number(acc.total_sales ?? 0)}
                    logoCid={acc.logo_cid as string | undefined}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* CTA banner */}
        <section
          className="glass"
          style={{
            padding: "2rem",
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: "2rem",
            alignItems: "center",
            marginBottom: "2rem",
          }}
        >
          <div>
            <h3 style={{ color: "var(--text-primary)", marginBottom: "0.4rem", fontSize: "1.05rem", fontWeight: 700 }}>
              Start selling on AETHER-LOGOS
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>
              Register your shop, create listings, and reach buyers secured by on-chain escrow.
            </p>
          </div>
          <Link href="/vendor/register" className="btn-primary" style={{ textDecoration: "none", whiteSpace: "nowrap" }}>
            Register as Vendor →
          </Link>
        </section>
      </div>
    </main>
  );
}
