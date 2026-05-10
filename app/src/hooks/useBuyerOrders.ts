'use client';

import { useEffect, useMemo, useState } from "react";
import { BorshAccountsCoder } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { useAnchorClient } from "@/hooks/useAnchorClient";
import { ESCROW_PROGRAM_ID } from "@/lib/anchor";
import tradeEscrowIdl from "@/lib/idl/trade_escrow.json";
import type { TradeRow } from "./useSellerOrders";

const API = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8080";

type ApiTradeRecord = {
  pubkey?: string;
  trade_account?: string;
  wallet?: string;
  trade_id?: string;
  seller?: string;
  amount?: string;
  tracking_id?: string | null;
  status?: unknown;
  created_at?: string;
  account?: Record<string, unknown>;
};

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

function toPublicKey(value: unknown): PublicKey | null {
  const base58 = asBase58(value);
  if (!base58) return null;
  try {
    return new PublicKey(base58);
  } catch {
    return null;
  }
}

function firstDefined<T>(...values: T[]): T | undefined {
  return values.find((value) => value !== undefined && value !== null);
}

function parseCreatedAt(value: unknown): string | undefined {
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }

  if (typeof value === "string") {
    const timestamp = Date.parse(value);
    if (!Number.isNaN(timestamp)) {
      return String(Math.floor(timestamp / 1000));
    }
    return value;
  }

  if (value && typeof value === "object" && "toString" in (value as Record<string, unknown>)) {
    const rendered = String(value);
    return rendered === "[object Object]" ? undefined : rendered;
  }

  return undefined;
}

function normalizeStatus(status: unknown): Record<string, unknown> | string {
  if (!status) return { AwaitingShipment: {} };
  if (typeof status === "string") return status;
  if (typeof status === "object") return status as Record<string, unknown>;
  return { AwaitingShipment: {} };
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

const RAW_TRADE_CODER = new BorshAccountsCoder(patchIdl(tradeEscrowIdl));

function decodeTradeAccount(escrowProgram: NonNullable<ReturnType<typeof useAnchorClient>["escrowProgram"]>, data: Buffer) {
  try {
    return escrowProgram.coder.accounts.decode("TradeAccount", data);
  } catch {
    return escrowProgram.coder.accounts.decodeUnchecked("TradeAccount", data);
  }
}

function decodeRawTradeAccount(data: Buffer) {
  return RAW_TRADE_CODER.decode("TradeAccount", data) as Record<string, unknown>;
}

function dedupeTrades(rows: TradeRow[]): TradeRow[] {
  const deduped = new Map<string, TradeRow>();
  for (const row of rows) {
    deduped.set(row.pubkey.toBase58(), row);
  }
  return Array.from(deduped.values());
}

function normalizeTradeRow(input: TradeRow | ApiTradeRecord): TradeRow | null {
  const rawAccount = (input as ApiTradeRecord).account ?? (input as TradeRow).account ?? {};
  const buyer = toPublicKey(firstDefined(rawAccount.buyer, (input as ApiTradeRecord).wallet));
  const seller = toPublicKey(rawAccount.seller);
  const pubkeyString = asBase58((input as TradeRow).pubkey) ?? (input as ApiTradeRecord).pubkey ?? (input as ApiTradeRecord).trade_account;

  if (!pubkeyString) {
    return null;
  }

  const tradeId = firstDefined(
    rawAccount.tradeId,
    rawAccount.trade_id,
    rawAccount.id,
    (input as ApiTradeRecord).trade_id,
  );
  const amount = firstDefined(
    rawAccount.amount,
    rawAccount.total_amount,
    (input as ApiTradeRecord).amount,
    (input as ApiTradeRecord).account?.amount,
    "0",
  );
  const trackingId = firstDefined(rawAccount.trackingId, rawAccount.tracking_id, (input as ApiTradeRecord).tracking_id);
  const orderCreatedAt = firstDefined(
    parseCreatedAt(rawAccount.orderCreatedAt),
    parseCreatedAt(rawAccount.order_created_at),
    parseCreatedAt(rawAccount.created_at),
    parseCreatedAt((input as ApiTradeRecord).created_at),
  );
  const shipByDeadline = firstDefined(rawAccount.shipByDeadline, rawAccount.ship_by_deadline);
  let pubkey: PublicKey;

  try {
    pubkey = new PublicKey(pubkeyString);
  } catch {
    return null;
  }

  return {
    pubkey,
    account: {
      ...rawAccount,
      ...(buyer ? { buyer } : {}),
      ...(seller ? { seller } : {}),
      ...(!seller && (input as ApiTradeRecord).seller ? { seller: (input as ApiTradeRecord).seller } : {}),
      amount,
      total_amount: amount,
      tradeId,
      trade_id: tradeId,
      id: tradeId,
      trackingId,
      tracking_id: trackingId,
      orderCreatedAt,
      order_created_at: orderCreatedAt,
      created_at: orderCreatedAt,
      shipByDeadline,
      ship_by_deadline: shipByDeadline,
      status: normalizeStatus(firstDefined(rawAccount.status, (input as ApiTradeRecord).status)),
    },
  };
}

export function useBuyerOrders(refreshKey?: number) {
  const { escrowProgram, wallet, connection } = useAnchorClient();
  const [orders, setOrders] = useState<TradeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useMemo(
    () => async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!wallet?.publicKey) {
          console.log("useBuyerOrders: Skipping fetch - missing program or wallet", { 
            hasProgram: !!escrowProgram, 
            hasWallet: !!wallet?.publicKey 
          });
          setOrders([]);
          return;
        }

        console.log("useBuyerOrders: Fetching on-chain trades for", wallet.publicKey.toBase58());
        
        let orders: TradeRow[] = [];
        let useAnchorFetch = !!escrowProgram;

        // Try Anchor SDK first
        if (escrowProgram) {
          try {
            const rows = (await (escrowProgram.account as any).tradeAccount.all()) as TradeRow[];
            orders = rows
              .map(normalizeTradeRow)
              .filter((row): row is TradeRow => row !== null)
              .filter((r) => asBase58(r.account.buyer) === wallet.publicKey.toBase58());
            console.log("useBuyerOrders: Anchor SDK fetch succeeded, found", orders.length, "trades");
            useAnchorFetch = false;
          } catch (anchorErr: any) {
            console.warn("useBuyerOrders: Anchor SDK failed:", anchorErr?.message);
            console.log("useBuyerOrders: Falling back to decodeUnchecked + raw accounts...");
            useAnchorFetch = true;
          }
        }

        // Fallback: Use decodeUnchecked with error handling
        if (useAnchorFetch && escrowProgram) {
          const connection = escrowProgram.provider.connection;
          const programId = escrowProgram.programId;
          
          console.log("useBuyerOrders: Fetching all program accounts...");
          const accounts = await connection.getProgramAccounts(programId);
          
          console.log(`useBuyerOrders: Raw accounts found: ${accounts.length}`);
          
          for (const { pubkey, account } of accounts) {
            console.log(
              "useBuyerOrders: Raw account:", pubkey.toBase58(),
              "size:", account.data.length,
              "discriminator:", Array.from(account.data.slice(0, 8))
            );
            try {
              const decoded = decodeTradeAccount(escrowProgram, account.data as Buffer);
              console.log(
                "useBuyerOrders: Decoded account:", pubkey.toBase58(),
                "buyer:", decoded.buyer?.toBase58?.() ?? decoded.buyer
              );
              // Check if buyer matches
              if (decoded.buyer?.toBase58() === wallet.publicKey.toBase58()) {
                const normalized = normalizeTradeRow({ pubkey, account: decoded } as TradeRow);
                if (normalized) {
                  orders.push(normalized);
                }
              }
            } catch (decodeErr: any) {
              // Skip accounts that don't decode — old format or different type
              console.log("useBuyerOrders: Failed to decode:", pubkey.toBase58(), decodeErr?.message);
              continue;
            }
          }
          
          console.log("useBuyerOrders: Decoded", orders.length, "trades for this wallet");
        }

        if (orders.length === 0) {
          console.log("useBuyerOrders: No Anchor trades found, fetching raw program accounts...");
          try {
            const accounts = await connection.getProgramAccounts(ESCROW_PROGRAM_ID);
            orders = accounts
              .map(({ pubkey, account }) => {
                try {
                  const decoded = decodeRawTradeAccount(account.data as Buffer);
                  return normalizeTradeRow({ pubkey, account: decoded } as TradeRow);
                } catch {
                  return null;
                }
              })
              .filter((row: TradeRow | null): row is TradeRow => row !== null)
              .filter((row) => asBase58(row.account.buyer) === wallet.publicKey.toBase58());
            console.log("useBuyerOrders: Raw RPC returned", orders.length, "trades");
          } catch (rawErr) {
            console.warn("useBuyerOrders: Raw RPC fetch failed:", (rawErr as any)?.message);
          }
        }

        // If still empty, try agent as last resort
        if (orders.length === 0) {
          console.log("useBuyerOrders: No on-chain trades found, checking agent...");
          try {
            const res = await fetch(
              `${API}/api/trades?wallet=${wallet.publicKey.toBase58()}`,
              { signal: AbortSignal.timeout(5000) }
            );
            if (res.ok) {
              const payload = await res.json();
              const agentTrades = Array.isArray(payload?.trades) ? payload.trades : [];
              console.log("useBuyerOrders: Agent returned", agentTrades.length, "trades");
              const filteredAgentTrades = agentTrades.filter(
                (trade: ApiTradeRecord) => trade.wallet === wallet.publicKey.toBase58(),
              );

              const accountKeys = filteredAgentTrades
                .map((trade: ApiTradeRecord) => trade.trade_account)
                .filter((value: string | undefined): value is string => typeof value === "string" && value.length > 0);

              const hydratedFromChain = new Map<string, TradeRow>();
              if (accountKeys.length > 0) {
                try {
                  const uniqueAccountKeys = accountKeys.filter(
                    (key: string, index: number, all: string[]) => all.indexOf(key) === index,
                  );
                  const pubkeys = uniqueAccountKeys.map((key: string) => new PublicKey(key));
                  const infos = await connection.getMultipleAccountsInfo(pubkeys, "confirmed");
                  infos.forEach((info, index) => {
                    if (!info?.data) return;
                    try {
                      const decoded = decodeRawTradeAccount(info.data as Buffer);
                      const normalized = normalizeTradeRow({
                        pubkey: pubkeys[index],
                        account: decoded,
                      } as TradeRow);
                      if (normalized) {
                        hydratedFromChain.set(pubkeys[index].toBase58(), normalized);
                      }
                    } catch {
                      // Ignore undecodable accounts and keep the agent fallback row.
                    }
                  });
                  console.log("useBuyerOrders: Hydrated", hydratedFromChain.size, "agent trades from chain");
                } catch (hydrateErr) {
                  console.warn("useBuyerOrders: Agent hydration failed:", (hydrateErr as any)?.message);
                }
              }

              orders = filteredAgentTrades
                .map((trade: ApiTradeRecord) => {
                  const tradeAccount = trade.trade_account;
                  if (tradeAccount && hydratedFromChain.has(tradeAccount)) {
                    return hydratedFromChain.get(tradeAccount) ?? null;
                  }

                  return normalizeTradeRow(trade);
                })
                .filter((row: TradeRow | null): row is TradeRow => row !== null);
            }
          } catch (agentErr) {
            console.warn("useBuyerOrders: Agent fetch also failed:", (agentErr as any)?.message);
          }
        }

        setOrders(dedupeTrades(orders.filter((o) => o.pubkey != null)));
        setError(null);
      } catch (err: any) {
        console.warn("useBuyerOrders: Unexpected error:", err?.message || err, err?.stack);
        setOrders([]);
        setError(err?.message || "Failed to load orders");
      } finally {
        setLoading(false);
      }
    },
    [connection, escrowProgram, wallet?.publicKey],
  );

  useEffect(() => {
    // Only fetch if the wallet is ready.
    if (!wallet?.publicKey) {
      return;
    }
    void load();
    const id = setInterval(() => void load(), 10_000);
    return () => clearInterval(id);
  }, [load, refreshKey, wallet?.publicKey]);

  return { orders, reload: load, loading, error };
}
