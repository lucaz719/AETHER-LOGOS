import { NextRequest, NextResponse } from "next/server";
import { getCoder } from "@/lib/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import tradeEscrowIdl from "@/lib/idl/trade_escrow.json";

function asBase58(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toBase58" in (value as Record<string, unknown>)) {
    const candidate = (value as { toBase58?: () => string }).toBase58;
    if (typeof candidate === "function") {
      return candidate();
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const buyer = searchParams.get("buyer");
  const seller = searchParams.get("seller");
  const endpoint = process.env.SOLANA_RPC_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  const programId = process.env.NEXT_PUBLIC_ESCROW_PROGRAM_ID;

  if (!buyer && !seller) {
    return NextResponse.json({ error: "buyer or seller query param is required" }, { status: 400 });
  }
  if (!programId) {
    return NextResponse.json({ trades: [], warning: "NEXT_PUBLIC_ESCROW_PROGRAM_ID not set" });
  }

  const connection = new Connection(endpoint, "confirmed");
  const programKey = new PublicKey(programId);
  const accounts = await connection.getProgramAccounts(programKey, { encoding: "base64" });
  const coder = getCoder(tradeEscrowIdl);
  const buyerFilter = buyer?.trim();
  const sellerFilter = seller?.trim();

  const trades = accounts
    .map((a) => {
      const raw = Array.isArray(a.account.data) ? a.account.data[0] : null;
      if (!raw) return null;
      const decoded = coder.decode("tradeAccount", Buffer.from(raw, "base64")) as Record<string, unknown> | null;
      if (!decoded) return null;
      const buyerKey = asBase58(decoded.buyer);
      const sellerKey = asBase58(decoded.seller);
      return {
        pubkey: a.pubkey.toBase58(),
        account: decoded,
        buyer: buyerKey,
        seller: sellerKey,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .filter((row) => (!buyerFilter || row.buyer === buyerFilter) && (!sellerFilter || row.seller === sellerFilter));

  return NextResponse.json({
    trades,
    filter: { buyer, seller },
  });
}
