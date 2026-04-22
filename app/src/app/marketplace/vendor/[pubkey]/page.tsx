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
  const avgRating = ratingCount > 0 ? (ratingSum / ratingCount).toFixed(1) : "No reviews yet";

  // Fetch listings for this vendor
  const allAccounts = await connection.getProgramAccounts(programKey, { encoding: "base64" }).catch(() => []);
  const listings = allAccounts
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

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1rem" }}>
      <div style={{ display: "grid", gap: "0.25rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.4rem" }}>
              <h1 style={{ margin: 0, fontSize: "1.6rem" }}>{String(profile.shop_name ?? "")}</h1>
              {Boolean(profile.is_verified) && (
                <span style={{ background: "#16a34a", color: "#fff", borderRadius: 9999, padding: "0.15rem 0.6rem", fontSize: "0.7rem" }}>✓ Verified</span>
              )}
              <span style={{ background: "#e2e8f0", borderRadius: 9999, padding: "0.15rem 0.6rem", fontSize: "0.7rem", color: "#475569" }}>{vendorType}</span>
            </div>
            <p style={{ margin: "0 0 0.5rem", color: "#64748b" }}>{String(profile.shop_description ?? "")}</p>
            <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
              ★ {avgRating} ({ratingCount} reviews) &bull; {(Number(profile.total_sales ?? 0) / 1_000_000).toFixed(2)} USDC total sales
            </div>
          </div>
          <Link
            href={`/vendor/register`}
            style={{ fontSize: "0.8rem", color: "#94a3b8", textDecoration: "none" }}
          >
            {shortKey(pubkey)}
          </Link>
        </div>
      </div>

      <h2 style={{ margin: "0 0 1rem", fontSize: "1.1rem" }}>Listings ({listings.length})</h2>
      {listings.length === 0 ? (
        <p style={{ color: "#94a3b8" }}>No active listings yet.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
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
    </main>
  );
}
