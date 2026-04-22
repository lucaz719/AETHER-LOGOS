import { NextRequest, NextResponse } from "next/server";
import { BorshAccountsCoder, Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import marketplaceIdl from "@/lib/idl/marketplace.json";

const PROGRAM_ID = process.env.NEXT_PUBLIC_MARKETPLACE_PROGRAM_ID ?? "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnN";
const RPC = process.env.SOLANA_RPC_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const vendor = searchParams.get("vendor");
  const category = searchParams.get("category");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const search = searchParams.get("search")?.toLowerCase();
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = 20;

  const connection = new Connection(RPC, "confirmed");
  const programKey = new PublicKey(PROGRAM_ID);
  const coder = new BorshAccountsCoder(marketplaceIdl as Idl);

  const accounts = await connection.getProgramAccounts(programKey, { encoding: "base64" });

  let listings = accounts
    .map((a) => {
      const raw = Array.isArray(a.account.data) ? a.account.data[0] : null;
      if (!raw) return null;
      try {
        const decoded = coder.decode("ProductListing", Buffer.from(raw, "base64")) as Record<string, unknown> | null;
        if (!decoded) return null;
        return { pubkey: a.pubkey.toBase58(), account: decoded };
      } catch {
        return null;
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  // Apply filters
  if (vendor) {
    listings = listings.filter((l) => {
      const v = l.account.vendor;
      const vKey = typeof v === "string" ? v : typeof v === "object" && v !== null && "toBase58" in (v as Record<string, unknown>) ? (v as { toBase58: () => string }).toBase58() : String(v);
      return vKey === vendor;
    });
  }
  if (category) {
    listings = listings.filter((l) => {
      const cat = l.account.category;
      return typeof cat === "object" && cat !== null && category in (cat as Record<string, unknown>);
    });
  }
  if (minPrice) {
    listings = listings.filter((l) => Number(l.account.price_usdc) >= Number(minPrice) * 1_000_000);
  }
  if (maxPrice) {
    listings = listings.filter((l) => Number(l.account.price_usdc) <= Number(maxPrice) * 1_000_000);
  }
  if (search) {
    listings = listings.filter((l) => {
      const title = String(l.account.title ?? "").toLowerCase();
      const desc = String(l.account.description ?? "").toLowerCase();
      return title.includes(search) || desc.includes(search);
    });
  }
  // Only active listings
  listings = listings.filter((l) => Boolean(l.account.is_active));

  const total = listings.length;
  const paginated = listings.slice((page - 1) * pageSize, page * pageSize);

  return NextResponse.json({ listings: paginated, total, page, pageSize });
}
