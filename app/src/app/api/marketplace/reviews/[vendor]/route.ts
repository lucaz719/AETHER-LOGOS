import { NextRequest, NextResponse } from "next/server";
import { BorshAccountsCoder, Idl } from "@coral-xyz/anchor";
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ vendor: string }> },
) {
  const { vendor } = await params;

  const connection = new Connection(RPC, "confirmed");
  const programKey = new PublicKey(PROGRAM_ID);
  const coder = new BorshAccountsCoder(marketplaceIdl as Idl);

  const accounts = await connection.getProgramAccounts(programKey, { encoding: "base64" });

  const reviews = accounts
    .map((a) => {
      const raw = Array.isArray(a.account.data) ? a.account.data[0] : null;
      if (!raw) return null;
      try {
        const decoded = coder.decode("VendorReview", Buffer.from(raw, "base64")) as Record<string, unknown> | null;
        if (!decoded) return null;
        const vendorKey = pubkeyStr(decoded.vendor);
        if (vendorKey !== vendor) return null;
        if (!Boolean(decoded.is_active)) return null;
        return { pubkey: a.pubkey.toBase58(), account: decoded };
      } catch {
        return null;
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return NextResponse.json({ reviews, vendor });
}
