import { CategoryNav } from "@/components/CategoryNav";
import { ProductCard } from "@/components/ProductCard";
import { SearchBar } from "@/components/SearchBar";
import { BorshAccountsCoder, Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import marketplaceIdl from "@/lib/idl/marketplace.json";

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

  const connection = new Connection(RPC, "confirmed");
  const programKey = new PublicKey(PROGRAM_ID);
  const coder = new BorshAccountsCoder(marketplaceIdl as Idl);
  const accounts = await connection.getProgramAccounts(programKey, { encoding: "base64" }).catch(() => []);

  const listings = accounts
    .map((a) => {
      const raw = Array.isArray(a.account.data) ? a.account.data[0] : null;
      if (!raw) return null;
      try {
        const decoded = coder.decode("ProductListing", Buffer.from(raw, "base64")) as Record<string, unknown> | null;
        if (!decoded || !decoded.is_active) return null;
        const cat = decoded.category as Record<string, unknown>;
        if (!cat || !(category in cat)) return null;
        return { pubkey: a.pubkey.toBase58(), account: decoded };
      } catch { return null; }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1rem" }}>
      <div style={{ marginBottom: "1.5rem" }}><SearchBar /></div>
      <div style={{ marginBottom: "1.5rem" }}><CategoryNav active={slug} /></div>
      <h2 style={{ margin: "0 0 1rem" }}>
        {category}
        <span style={{ fontWeight: 400, color: "#64748b", fontSize: "0.9rem", marginLeft: "0.5rem" }}>
          ({listings.length})
        </span>
      </h2>
      {listings.length === 0 ? (
        <p style={{ color: "#94a3b8" }}>No listings in this category yet.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
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
