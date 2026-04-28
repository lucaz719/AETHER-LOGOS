import { NextRequest, NextResponse } from "next/server";
import { getCoder } from "@/lib/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import marketplaceIdl from "@/lib/idl/marketplace.json";

const PROGRAM_ID = process.env.NEXT_PUBLIC_MARKETPLACE_PROGRAM_ID ?? "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnN";
const RPC = process.env.SOLANA_RPC_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

export async function GET(req: NextRequest) {
  try {
    const connection = new Connection(RPC, "confirmed");
    const programKey = new PublicKey(PROGRAM_ID);
    const coder = getCoder(marketplaceIdl);

    // Filter by VendorProfile discriminator [212, 127, 49, 14, 158, 116, 14, 66]
    const discriminator = Buffer.from([212, 127, 49, 14, 158, 116, 14, 66]).toString("base64");
    const accounts = await connection.getProgramAccounts(programKey, {
      encoding: "base64",
      filters: [{ memcmp: { offset: 0, bytes: discriminator, encoding: "base64" } }],
    });

    const requests = accounts
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
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .filter((r) => !Boolean(r.account.is_verified)); // Only pending verification

    return NextResponse.json({ requests });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch verification requests" }, { status: 500 });
  }
}
