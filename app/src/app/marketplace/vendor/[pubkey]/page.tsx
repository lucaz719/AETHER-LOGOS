import { BorshAccountsCoder, Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import marketplaceIdl from "@/lib/idl/marketplace.json";
import { ProductCard } from "@/components/ProductCard";
import Link from "next/link";
import { notFound } from "next/navigation";

const PROGRAM_ID = process.env.NEXT_PUBLIC_MARKETPLACE_PROGRAM_ID ?? "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnN";
const RPC = process.env.SOLANA_RPC_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

function shortKey(k: string) {
  return `${k.slice(0, 4)}…${k.slice(-4)}`;
}

function asBase58Str(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toBase58" in (value as Record<string, unknown>)) {
    return (value as { toBase58: () => string }).toBase58();
  }
  return null;
}

export default async function VendorPage({
  params,
}: {
  params: Promise<{ pubkey: string }>;
}) {
  const { pubkey } = await params;

  const connection = new Connection(RPC, "confirmed");
  const programKey = new PublicKey(PROGRAM_ID);
  const coder = new BorshAccountsCoder(marketplaceIdl as Idl);

  let authorityKey: PublicKey;
  try { authorityKey = new PublicKey(pubkey); }
  catch { notFound(); return null; }

  const [profilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vendor"), authorityKey.toBuffer()],
    programKey,
  );

  const info = await connection.getAccountInfo(profilePda).catch(() => null);
  if (!info) notFound();

  let profile: Record<string, unknown>;
  try { profile = coder.decode("VendorProfile", info!.data) as Record<string, unknown>; }
  catch { notFound(); return null; }

  const vendorType = Object.keys(profile.vendor_type as Record<string, unknown>)[0] ?? "";
  const ratingSum = Number(profile.rating_sum ?? 0);
  const ratingCount = Number(profile.rating_count ?? 0);
  const avgRating = ratingCount > 0 ? (ratingSum / ratingCount).toFixed(1) : null;

  // Fetch listings with discriminator filter
  const listingDisc = Buffer.from([12, 188, 195, 61, 183, 115, 249, 54]).toString("base64");
  const reviewDisc = Buffer.from([177, 64, 117, 65, 72, 201, 59, 4]).toString("base64");

  const [listingAccts, reviewAccts] = await Promise.all([
    connection.getProgramAccounts(programKey, {
      encoding: "base64",
      filters: [{ memcmp: { offset: 0, bytes: listingDisc, encoding: "base64" } }],
    }).catch(() => []),
    connection.getProgramAccounts(programKey, {
      encoding: "base64",
      filters: [{ memcmp: { offset: 0, bytes: reviewDisc, encoding: "base64" } }],
    }).catch(() => []),
  ]);

  const listings = listingAccts
    .map((a) => {
      const raw = Array.isArray(a.account.data) ? a.account.data[0] : null;
      if (!raw) return null;
      try {
        const d = coder.decode("ProductListing", Buffer.from(raw, "base64")) as Record<string, unknown> | null;
        if (!d) return null;
        const vendorAddr = asBase58Str(d.vendor);
        if (vendorAddr !== pubkey) return null;
        return { pubkey: a.pubkey.toBase58(), account: d };
      } catch { return null; }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const reviews = reviewAccts
    .map((a) => {
      const raw = Array.isArray(a.account.data) ? a.account.data[0] : null;
      if (!raw) return null;
      try {
        const d = coder.decode("VendorReview", Buffer.from(raw, "base64")) as Record<string, unknown> | null;
        if (!d || !d.is_active) return null;
        const vendorAddr = asBase58Str(d.vendor);
        if (vendorAddr !== pubkey) return null;
        return { pubkey: a.pubkey.toBase58(), account: d };
      } catch { return null; }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const VENDOR_TYPE_COLORS: Record<string, string> = {
    retailer: "cyan",
    wholesaler: "violet",
    distributor: "cyan",
    manufacturer: "amber",
  };
  const typeClass = `badge badge-${VENDOR_TYPE_COLORS[vendorType.toLowerCase()] ?? "cyan"}`;

  return (
    <main className="page-container">
      {/* Vendor banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(0,212,255,0.05) 0%, rgba(124,58,237,0.08) 100%)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "2rem",
          marginBottom: "2.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "grid", gap: "0.5rem" }}>
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
              {String(profile.shop_name ?? "")}
            </h1>
            {Boolean(profile.is_verified) && (
              <span className="badge badge-green">✓ Verified</span>
            )}
            <span className={typeClass}>
              {vendorType.charAt(0).toUpperCase() + vendorType.slice(1)}
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0, lineHeight: 1.6 }}>
            {String(profile.shop_description ?? "")}
          </p>
          <div style={{ display: "flex", gap: "1rem", fontSize: "0.82rem" }}>
            <span style={{ color: "var(--amber)" }}>
              {"★".repeat(Math.round(ratingCount > 0 ? ratingSum / ratingCount : 0))}
              <span style={{ color: "var(--text-muted)", marginLeft: "0.3rem" }}>
                {avgRating ?? "—"} ({ratingCount} reviews)
              </span>
            </span>
            <span style={{ color: "var(--text-muted)" }}>
              {(Number(profile.total_sales ?? 0) / 1_000_000).toFixed(2)} USDC total sales
            </span>
          </div>
          <span className="addr">{pubkey}</span>
        </div>
      </div>

      {/* Listings */}
      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "var(--text-primary)" }}>
          Listings <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({listings.length})</span>
        </h2>
        {listings.length === 0 ? (
          <div className="glass" style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📦</div>
            <p>No listings yet from this vendor.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "1rem" }}>
            {listings.map((l) => (
              <ProductCard
                key={l.pubkey}
                pubkey={l.pubkey}
                title={String(l.account.title ?? "")}
                priceUsdc={Number(l.account.price_usdc ?? 0)}
                minOrderQty={Number(l.account.min_order_qty ?? 1)}
                vendorName={String(profile.shop_name ?? "")}
                vendorAuthority={pubkey}
                category={Object.keys(l.account.category as Record<string, unknown>)[0] ?? "Other"}
                imagesCid={l.account.images_cid as string | undefined}
                isActive={Boolean(l.account.is_active)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Reviews */}
      <section>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "var(--text-primary)" }}>
          Reviews <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({reviews.length})</span>
        </h2>
        {reviews.length === 0 ? (
          <div className="glass" style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
            <p>No reviews yet for this vendor.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {reviews.map((r) => {
              const rating = Number(r.account.rating ?? 0);
              const reviewer = asBase58Str(r.account.reviewer);
              const createdAt = r.account.created_at ? new Date(Number(r.account.created_at) * 1000).toLocaleDateString() : "";
              return (
                <div key={r.pubkey} className="glass" style={{ padding: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                    <span style={{ color: "var(--amber)", fontSize: "1rem" }}>
                      {"★".repeat(rating)}
                      {"☆".repeat(5 - rating)}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{createdAt}</span>
                  </div>
                  {reviewer && <div className="addr" style={{ fontSize: "0.7rem" }}>by {reviewer.slice(0, 8)}…{reviewer.slice(-8)}</div>}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

