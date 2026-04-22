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
  const connection = new Connection(RPC, "confirmed");
  const programKey = new PublicKey(PROGRAM_ID);
  const coder = new BorshAccountsCoder(marketplaceIdl as Idl);

  let authorityKey: PublicKey;
  try {
    authorityKey = new PublicKey(pubkey);
  } catch {
    return NextResponse.json({ error: "Invalid pubkey" }, { status: 400 });
  }

  const [profilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vendor"), authorityKey.toBuffer()],
    programKey,
  );

  const info = await connection.getAccountInfo(profilePda);
  if (!info) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  try {
    const decoded = coder.decode("VendorProfile", info.data) as Record<string, unknown>;
    return NextResponse.json({ vendor: decoded, pubkey: profilePda.toBase58() });
  } catch {
    return NextResponse.json({ error: "Failed to decode vendor profile" }, { status: 500 });
  }
}
