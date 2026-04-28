import { CategoryNav } from "@/components/CategoryNav";
import { ProductCard } from "@/components/ProductCard";
import { SearchBar } from "@/components/SearchBar";
import { getCoder } from "@/lib/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import marketplaceIdl from "@/lib/idl/marketplace.json";
import Link from "next/link";

const PROGRAM_ID = process.env.NEXT_PUBLIC_MARKETPLACE_PROGRAM_ID ?? "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnN";
const RPC = process.env.SOLANA_RPC_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

const SLUG_TO_CATEGORY: Record<string, string> = {
  electronics: "Electronics",
  apparel: "Apparel",
  "home-goods": "HomeGoods",
  machinery: "Machinery",
  "food-beverage": "FoodBeverage",
  chemicals: "Chemicals",
  automotive: "Automotive",
  healthcare: "Healthcare",
  construction: "Construction",
  other: "Other",
};

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = SLUG_TO_CATEGORY[slug] ?? slug;
  const catKey = category.charAt(0).toLowerCase() + category.slice(1);

  const connection = new Connection(RPC, "confirmed");
  const programKey = new PublicKey(PROGRAM_ID);
  const coder = getCoder(marketplaceIdl);

  const listingDisc = Buffer.from([12, 188, 195, 61, 183, 115, 249, 54]).toString("base64");
  const accounts = await connection.getProgramAccounts(programKey, {
    encoding: "base64",
    filters: [{ memcmp: { offset: 0, bytes: listingDisc, encoding: "base64" } }],
  }).catch(() => []);

  const listings = accounts
    .map((a) => {
      const raw = Array.isArray(a.account.data) ? a.account.data[0] : null;
      if (!raw) return null;
      try {
        const decoded = coder.decode("ProductListing", Buffer.from(raw, "base64")) as Record<string, unknown> | null;
        if (!decoded || !decoded.is_active) return null;
        const cat = decoded.category as Record<string, unknown>;
        if (!cat || !(catKey in cat)) return null;
        return { pubkey: a.pubkey.toBase58(), account: decoded };
      } catch { return null; }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return (
    <main className="page-container">
      <div style={{ marginBottom: "1.25rem" }}><SearchBar /></div>
      <div style={{ marginBottom: "1.5rem" }}><CategoryNav active={slug} /></div>
      <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1.25rem" }}>
        {category}
        <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: "0.85rem", marginLeft: "0.5rem" }}>
          ({listings.length})
        </span>
      </h2>
      {listings.length === 0 ? (
        <div className="glass" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🏷️</div>
          <p style={{ marginBottom: "1rem" }}>No listings in this category yet.</p>
          <Link href="/marketplace" style={{ color: "var(--cyan)" }}>← Back to Marketplace</Link>
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
              vendorAuthority={typeof l.account.vendor === "string" ? l.account.vendor : ""}
              category={category}
              imagesCid={l.account.images_cid as string | undefined}
              isActive={Boolean(l.account.is_active)}
            />
          ))}
        </div>
      )}
    </main>
  );
}

