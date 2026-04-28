import { NextRequest, NextResponse } from "next/server";
import { getCoder } from "@/lib/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import marketplaceIdl from "@/lib/idl/marketplace.json";

const PROGRAM_ID = process.env.NEXT_PUBLIC_MARKETPLACE_PROGRAM_ID ?? "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnN";
const RPC = process.env.SOLANA_RPC_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

function pubkeyStr(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toBase58" in (value as Record<string, unknown>)) {
    return (value as { toBase58: () => string }).toBase58();
  }
  return null;
}

let cacheTime = 0;
let cachedAccounts: readonly any[] | null = null;
const CACHE_TTL = 10_000; // 10 seconds for orders

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const buyer = searchParams.get("buyer");
  const vendor = searchParams.get("vendor");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = 20;

  if (!buyer && !vendor) {
    return NextResponse.json({ error: "buyer or vendor query param is required" }, { status: 400 });
  }

  const connection = new Connection(RPC, "confirmed");
  const programKey = new PublicKey(PROGRAM_ID);
  const coder = getCoder(marketplaceIdl);

  let accounts: readonly any[] = [];
  const now = Date.now();
  if (cachedAccounts && now - cacheTime < CACHE_TTL) {
    accounts = cachedAccounts;
  } else {
    // Filter by MarketplaceOrder discriminator [36,193,241,88,220,254,185,68] to avoid fetching every account.
    const discriminator = Buffer.from([36, 193, 241, 88, 220, 254, 185, 68]).toString("base64");
    accounts = await connection.getProgramAccounts(programKey, {
      encoding: "base64",
      filters: [{ memcmp: { offset: 0, bytes: discriminator, encoding: "base64" } }],
    });
    cachedAccounts = accounts;
    cacheTime = now;
  }

  let orders = accounts
    .map((a) => {
      const raw = Array.isArray(a.account.data) ? a.account.data[0] : null;
      if (!raw) return null;
      try {
        const decoded = coder.decode("MarketplaceOrder", Buffer.from(raw, "base64")) as Record<string, unknown> | null;
        if (!decoded) return null;
        return {
          pubkey: a.pubkey.toBase58(),
          account: decoded,
          buyerKey: pubkeyStr(decoded.buyer),
          vendorKey: pubkeyStr(decoded.vendor),
        };
      } catch {
        return null;
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (buyer) orders = orders.filter((o) => o.buyerKey === buyer);
  if (vendor) orders = orders.filter((o) => o.vendorKey === vendor);

  const total = orders.length;
  const paginated = orders.slice((page - 1) * pageSize, page * pageSize).map(({ pubkey, account }) => ({ pubkey, account }));

  return NextResponse.json({ orders: paginated, total, page, pageSize });
}
