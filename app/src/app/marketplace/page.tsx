import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { CategoryNav } from "@/components/CategoryNav";
import { ProductCard } from "@/components/ProductCard";
import { VendorCard } from "@/components/VendorCard";
import { BorshAccountsCoder, Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import marketplaceIdl from "@/lib/idl/marketplace.json";

export const metadata = { title: "Marketplace | AETHER-LOGOS" };

const PROGRAM_ID = process.env.NEXT_PUBLIC_MARKETPLACE_PROGRAM_ID ?? "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnN";
const RPC = process.env.SOLANA_RPC_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

async function fetchFeatured() {
  try {
    const connection = new Connection(RPC, "confirmed");
    const programKey = new PublicKey(PROGRAM_ID);
    const coder = new BorshAccountsCoder(marketplaceIdl as Idl);

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

    const listings = listingAccts
      .map((a) => {
        const raw = Array.isArray(a.account.data) ? a.account.data[0] : null;
        if (!raw) return null;
        try {
          const dec = coder.decode("ProductListing", Buffer.from(raw, "base64")) as Record<string, unknown>;
          if (!dec || !dec.is_active) return null;
          return { pubkey: a.pubkey.toBase58(), account: dec };
        } catch { return null; }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .slice(0, 8);

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
        const ratingA = Number(a.account.rating_count ?? 0) > 0
          ? Number(a.account.rating_sum ?? 0) / Number(a.account.rating_count)
          : 0;
        const ratingB = Number(b.account.rating_count ?? 0) > 0
          ? Number(b.account.rating_sum ?? 0) / Number(b.account.rating_count)
          : 0;
        return ratingB - ratingA;
      })
      .slice(0, 4);

    return { listings, vendors };
  } catch {
    return { listings: [], vendors: [] };
  }
}

export default async function MarketplacePage() {
  const { listings, vendors } = await fetchFeatured();

  return (
    <main>
      {/* Hero */}
      <section
        className="hero-mesh"
        style={{ padding: "5rem 1.25rem 4rem", textAlign: "center" }}
      >
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
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
            Every order is secured by the on-chain escrow vault. Funds are released only upon verified delivery.
          </p>
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            <SearchBar />
          </div>
        </div>
      </section>

      <div className="page-container">
        {/* Category nav */}
        <section style={{ marginBottom: "2.5rem" }}>
          <CategoryNav />
        </section>

        {/* Featured Products */}
        <section style={{ marginBottom: "3rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1.2rem", color: "var(--text-primary)" }}>
              ⚡ Featured Products
            </h2>
            <Link href="/marketplace/search" style={{ fontSize: "0.82rem", color: "var(--cyan)" }}>
              View all →
            </Link>
          </div>
          {listings.length === 0 ? (
            <div
              className="glass"
              style={{ textAlign: "center", padding: "3rem 2rem", color: "var(--text-muted)" }}
            >
              <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>🏪</div>
              <p>No listings yet. <Link href="/vendor/register">Register as a vendor</Link> to create the first listing.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "1rem" }}>
              {listings.map((l) => {
                const category = Object.keys(l.account.category as Record<string, unknown>)[0] ?? "Other";
                const vendorKey = typeof l.account.vendor === "string"
                  ? l.account.vendor
                  : (l.account.vendor as { toBase58?: () => string })?.toBase58?.() ?? "";
                return (
                  <ProductCard
                    key={l.pubkey}
                    pubkey={l.pubkey}
                    title={String(l.account.title ?? "")}
                    priceUsdc={Number(l.account.price_usdc ?? 0)}
                    minOrderQty={Number(l.account.min_order_qty ?? 1)}
                    vendorAuthority={vendorKey}
                    category={category}
                    imagesCid={l.account.images_cid as string | undefined}
                    isActive={Boolean(l.account.is_active)}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Top Vendors */}
        <section style={{ marginBottom: "3rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1.2rem", color: "var(--text-primary)" }}>
              🏆 Top Vendors
            </h2>
            <Link href="/marketplace/search?tab=vendors" style={{ fontSize: "0.82rem", color: "var(--cyan)" }}>
              View all →
            </Link>
          </div>
          {vendors.length === 0 ? (
            <div className="glass" style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
              <p>No vendors yet.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
              {vendors.map((v) => {
                const acc = v.account;
                const vt = acc.vendor_type as Record<string, unknown>;
                const vendorType = vt ? (Object.keys(vt)[0] ?? "Other") : "Other";
                const auth = typeof acc.authority === "string"
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
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Quick links + CTA */}
        <section
          className="glass"
          style={{ padding: "2rem", display: "grid", gridTemplateColumns: "1fr auto", gap: "2rem", alignItems: "center" }}
        >
          <div>
            <h3 style={{ color: "var(--text-primary)", marginBottom: "0.4rem" }}>Start selling on AETHER-LOGOS</h3>
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

