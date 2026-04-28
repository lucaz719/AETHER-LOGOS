import { NextRequest, NextResponse } from "next/server";
import { getCoder } from "@/lib/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import marketplaceIdl from "@/lib/idl/marketplace.json";

const PROGRAM_ID = process.env.NEXT_PUBLIC_MARKETPLACE_PROGRAM_ID ?? "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnN";
const RPC = process.env.SOLANA_RPC_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // 'Retailer' | 'Wholesaler' | ...
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = 20;

  const connection = new Connection(RPC, "confirmed");
  const programKey = new PublicKey(PROGRAM_ID);
  const coder = getCoder(marketplaceIdl);

  // Filter by VendorProfile discriminator [212,127,49,14,158,116,14,66] to avoid fetching every account.
  const discriminator = Buffer.from([212, 127, 49, 14, 158, 116, 14, 66]).toString("base64");
  const accounts = await connection.getProgramAccounts(programKey, {
    encoding: "base64",
    filters: [{ memcmp: { offset: 0, bytes: discriminator, encoding: "base64" } }],
  });

  let vendors = accounts
    .map((a) => {
      const raw = Array.isArray(a.account.data) ? a.account.data[0] : null;
      if (!raw) return null;
      try {
        const decoded = coder.decode("VendorProfile", Buffer.from(raw, "base64")) as Record<string, unknown> | null;
        if (!decoded) return null;
        return { pubkey: a.pubkey.toBase58(), account: decoded };
      } catch {
        return null;
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (type) {
    vendors = vendors.filter((v) => {
      const vt = v.account.vendor_type;
      return typeof vt === "object" && vt !== null && type in (vt as Record<string, unknown>);
    });
  }

  const total = vendors.length;
  const paginated = vendors.slice((page - 1) * pageSize, page * pageSize);

  return NextResponse.json({ vendors: paginated, total, page, pageSize });
}
