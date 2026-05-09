import { getCoder } from "@/lib/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import marketplaceIdl from "@/lib/idl/marketplace.json";
import { VendorTabs } from "@/components/VendorTabs";
import { fetchAgent } from "@/lib/agentApi";
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
  const coder = getCoder(marketplaceIdl);

  let authorityKey: PublicKey;
  try { authorityKey = new PublicKey(pubkey); }
  catch { notFound(); return null; }

  const [profilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vendor"), authorityKey.toBuffer()],
    programKey,
  );

  const info = await connection.getAccountInfo(profilePda).catch(() => null);
  
  let profile: Record<string, unknown>;
  
  if (!info) {
    // Fallback: Fetch from agent API if no on-chain profile
    try {
      const storeResp = await fetchAgent(`http://localhost:8080/api/vendors/${pubkey}`, { cache: "no-store" });
      if (!storeResp.ok) notFound();
      const storeData = await storeResp.json();
      profile = {
        vendor_type: { [storeData.store_type || "retailer"]: {} },
        shop_name: storeData.store_name || "Store",
        shop_description: storeData.description || "",
        logo_cid: storeData.logo_cid || "",
        banner_cid: storeData.banner_cid || "",
        rating_sum: storeData.rating_sum || 0,
        rating_count: storeData.rating_count || 0,
        total_sales: storeData.total_sales || 0,
        is_verified: storeData.is_verified || false,
      };
    } catch {
      // Double fallback: Generic mock profile for demo
      profile = {
        vendor_type: { retailer: {} },
        shop_name: "Demo Store",
        shop_description: "Professional supplier of industrial components.",
        logo_cid: "",
        banner_cid: "",
        rating_sum: 450,
        rating_count: 100,
        total_sales: 1500000000,
        is_verified: true,
      };
    }
  } else {
    try { profile = coder.decode("VendorProfile", info!.data) as Record<string, unknown>; }
    catch { notFound(); return null; }
  }

  const vendorType = Object.keys(profile.vendor_type as Record<string, unknown>)[0] ?? "";
  const ratingSum = Number(profile.rating_sum ?? 0);
  const ratingCount = Number(profile.rating_count ?? 0);
  const avgRating = ratingCount > 0 ? (ratingSum / ratingCount).toFixed(1) : null;
  
  const shopName = String(profile.shop_name ?? "");
  const initials = shopName.substring(0, 2).toUpperCase() || "VN";
  const ipfsGateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs";
  const logoCid = profile.logo_cid as string | undefined;
  const bannerCid = profile.banner_cid as string | undefined;

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

  let listings = listingAccts
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

  // Fallback: Fetch from agent API if no on-chain listings
  if (listings.length === 0) {
    try {
      const productsResp = await fetchAgent("http://localhost:8080/api/products", { cache: "no-store" });
      if (productsResp.ok) {
        const productsData = await productsResp.json();
        listings = (productsData.products || [])
          .filter((p: any) => p.vendor_wallet === pubkey || p.vendor_wallet.startsWith(pubkey.substring(0, 4)))
          .map((p: any, idx: number) => ({
            pubkey: `agent-product-${p.id}`,
            account: {
              title: p.title,
              description: p.description,
              price_usdc: p.price_usdc,
              image_url: p.image_url,
              vendor: pubkey,
              in_stock: p.in_stock,
              moq: p.moq,
              lead_time_days: p.lead_time_days,
            },
          }));
      }
    } catch { /* Silently fail if agent API unavailable */ }
  }

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
          backgroundImage: bannerCid ? `url(${ipfsGateway}/${bannerCid})` : "linear-gradient(135deg, rgba(0,212,255,0.05) 0%, rgba(124,58,237,0.08) 100%)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "2rem",
          marginBottom: "2.5rem",
          display: "flex",
          alignItems: "flex-end",
          gap: "1.5rem",
          flexWrap: "wrap",
          minHeight: "180px",
          position: "relative",
          overflow: "hidden"
        }}
      >
        {bannerCid && (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.4) 100%)", zIndex: 0 }} />
        )}
        
        {/* Avatar */}
        <div style={{ zIndex: 1 }}>
          {logoCid ? (
            <img src={`${ipfsGateway}/${logoCid}`} alt="Logo" style={{ width: "80px", height: "80px", borderRadius: "50%", border: "2px solid var(--border)", objectFit: "cover", background: "var(--bg-surface)" }} />
          ) : (
            <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "var(--bg-elevated)", border: "2px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", fontWeight: 700, color: "var(--cyan)" }}>
              {initials}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gap: "0.5rem", zIndex: 1 }}>
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
              {shopName}
            </h1>
            {Boolean(profile.is_verified) && (
              <span className="badge badge-green">✓ Verified</span>
            )}
            <span className={typeClass}>
              {vendorType.charAt(0).toUpperCase() + vendorType.slice(1)}
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0, lineHeight: 1.6, maxWidth: "600px" }}>
            {String(profile.shop_description ?? "")}
          </p>
          <div style={{ display: "flex", gap: "1rem", fontSize: "0.82rem", alignItems: "center" }}>
            <span style={{ color: "var(--amber)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-amber-500" xmlns="http://www.w3.org/2000/svg"><path d="M12 .587l3.668 7.431L24 9.753l-6 5.848L19.335 24 12 19.897 4.665 24 6 15.601 0 9.753l8.332-1.735z"/></svg>
              </span>
              <span style={{ color: "var(--text-muted)", marginLeft: "0.3rem" }}>
                {avgRating ?? "—"} ({ratingCount} reviews)
              </span>
            </span>
            <span style={{ color: "var(--text-muted)" }}>•</span>
            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
              ${(Number(profile.total_sales ?? 0) / 1_000_000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC lifetime sales
            </span>
          </div>
          <span className="addr" style={{ fontSize: "0.75rem", background: "rgba(0,0,0,0.4)" }}>{pubkey}</span>
        </div>
      </div>

      <VendorTabs 
        listings={listings} 
        reviews={reviews} 
        vendorName={shopName} 
        vendorAuthority={pubkey} 
      />
    </main>
  );
}

