import { NextRequest, NextResponse } from "next/server";
import { BorshAccountsCoder, Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import marketplaceIdl from "@/lib/idl/marketplace.json";

const PROGRAM_ID = process.env.NEXT_PUBLIC_MARKETPLACE_PROGRAM_ID ?? "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnN";
const RPC = process.env.SOLANA_RPC_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ pubkey: string }> },
) {
  const { pubkey } = await params;

  let listingKey: PublicKey;
  try {
    listingKey = new PublicKey(pubkey);
  } catch {
    return NextResponse.json({ error: "Invalid pubkey" }, { status: 400 });
  }

  const connection = new Connection(RPC, "confirmed");
  const info = await connection.getAccountInfo(listingKey);
  if (!info) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  const coder = new BorshAccountsCoder(marketplaceIdl as Idl);
  try {
    const decoded = coder.decode("ProductListing", info.data) as Record<string, unknown>;
    return NextResponse.json({ listing: decoded, pubkey });
  } catch {
    return NextResponse.json({ error: "Failed to decode listing" }, { status: 500 });
  }
}
