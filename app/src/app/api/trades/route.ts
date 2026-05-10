import { NextRequest, NextResponse } from "next/server";
import { BorshAccountsCoder } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import tradeEscrowIdl from "@/lib/idl/trade_escrow.json";

function asBase58(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toBase58" in (value as Record<string, unknown>)) {
    const key = value as { toBase58?: () => string };
    if (typeof key.toBase58 === "function") {
      return key.toBase58();
    }
  }
  return null;
}

function asOptionalString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "some" in (value as Record<string, unknown>)) {
    const maybeSome = (value as { some?: unknown }).some;
    if (typeof maybeSome === "string") return maybeSome;
  }
  return null;
}

function asStringValue(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (value && typeof value === "object" && "toString" in (value as Record<string, unknown>)) {
    const rendered = String(value);
    return rendered === "[object Object]" ? null : rendered;
  }
  return null;
}

function asHex(value: unknown): string | null {
  if (value instanceof Uint8Array) return Buffer.from(value).toString("hex");
  if (Array.isArray(value)) return Buffer.from(value).toString("hex");
  return typeof value === "string" ? value : null;
}

function asStatus(value: unknown): Record<string, unknown> | string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") return value as Record<string, unknown>;
  return null;
}

function resolveProgramId(): string | null {
  return (
    process.env.NEXT_PUBLIC_TRADE_ESCROW_PROGRAM_ID ??
    process.env.NEXT_PUBLIC_ESCROW_PROGRAM_ID ??
    (tradeEscrowIdl as { metadata?: { address?: string }; address?: string }).metadata?.address ??
    (tradeEscrowIdl as { address?: string }).address ??
    null
  );
}

function patchIdl(idl: any): any {
  const seenNames = new Set<string>();

  const cleanTypes = (idl.types || []).map((t: any) => {
    seenNames.add(t.name);
    if (t.type?.kind) return t;
    return {
      name: t.name,
      type: { kind: "struct", fields: t.type?.fields || [] },
    };
  });

  const accountTypes = (idl.accounts || [])
    .filter((a: any) => !seenNames.has(a.name))
    .map((a: any) => ({
      name: a.name,
      type: { kind: "struct", fields: a.type?.fields || [] },
    }));

  return { ...idl, types: [...cleanTypes, ...accountTypes] };
}

function decodeTradeAccount(
  coder: BorshAccountsCoder,
  raw: Buffer,
): Record<string, unknown> | null {
  try {
    return coder.decode("TradeAccount", raw) as Record<string, unknown> | null;
  } catch {
    try {
      return coder.decode("tradeAccount", raw) as Record<string, unknown> | null;
    } catch {
      return null;
    }
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const buyer = searchParams.get("buyer");
  const seller = searchParams.get("seller");
  const endpoint = process.env.SOLANA_RPC_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  const programId = resolveProgramId();
  if (!programId) {
    return NextResponse.json({ trades: [], warning: "trade escrow program id not set" });
  }

  const connection = new Connection(endpoint, "confirmed");
  const programKey = new PublicKey(programId);
  const accounts = await connection.getProgramAccounts(programKey);
  const coder = new BorshAccountsCoder(patchIdl(tradeEscrowIdl));
  const buyerFilter = buyer?.trim();
  const sellerFilter = seller?.trim();

  const trades = accounts
    .map((a) => {
      const raw = Buffer.isBuffer(a.account.data) ? a.account.data : null;
      if (!raw) return null;
      const decoded = decodeTradeAccount(coder, raw);
      if (!decoded) return null;
      const buyerKey = asBase58(decoded.buyer);
      const sellerKey = asBase58(decoded.seller);
      return {
        pubkey: a.pubkey.toBase58(),
        account: {
          tradeId: asHex(decoded.tradeId ?? decoded.trade_id),
          buyer: buyerKey,
          seller: sellerKey,
          amount: asStringValue(decoded.amount),
          platformFee: asStringValue(decoded.platformFee ?? decoded.platform_fee),
          paymentTokenMint: asBase58(decoded.paymentTokenMint ?? decoded.payment_token_mint),
          milestoneVerified: Boolean(decoded.milestoneVerified ?? decoded.milestone_verified),
          trackingId: asOptionalString(decoded.trackingId ?? decoded.tracking_id),
          carrier: asStringValue(decoded.carrier),
          sellerNotified: Boolean(decoded.sellerNotified ?? decoded.seller_notified),
          orderCreatedAt: asStringValue(decoded.orderCreatedAt ?? decoded.order_created_at),
          shipByDeadline: asStringValue(decoded.shipByDeadline ?? decoded.ship_by_deadline),
          shippedAt: asStringValue(decoded.shippedAt ?? decoded.shipped_at),
          signatureRequired: Boolean(decoded.signatureRequired ?? decoded.signature_required),
          signedBy: asOptionalString(decoded.signedBy ?? decoded.signed_by),
          invoiceCid: asOptionalString(decoded.invoiceCid ?? decoded.invoice_cid),
          status: asStatus(decoded.status),
        },
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
