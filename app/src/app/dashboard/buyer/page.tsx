'use client';

import { useMemo, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useAnchorClient } from "@/hooks/useAnchorClient";
import { useBuyerOrders } from "@/hooks/useBuyerOrders";
import { ESCROW_PROGRAM_ID } from "@/lib/anchor";
import { OrderCard } from "@/components/OrderCard";
import { TrackingTimeline } from "@/components/TrackingTimeline";

function statusKey(status: unknown): string {
  if (!status || typeof status !== "object") return "unknown";
  return Object.keys(status as Record<string, unknown>)[0] ?? "unknown";
}

function countdown(deadline: number): string {
  const sec = Math.max(0, deadline - Math.floor(Date.now() / 1000));
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
}

function optionalString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const maybeSome = record.some;
    if (typeof maybeSome === "string") return maybeSome;
  }
  return undefined;
}

export default function BuyerDashboardPage() {
  const { escrowProgram, wallet } = useAnchorClient();
  const { orders, reload } = useBuyerOrders();
  const [buyerTokenAccount, setBuyerTokenAccount] = useState("");
  const [sellerTokenAccount, setSellerTokenAccount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const activeOrders = useMemo(
    () => orders.filter((o) => !["released", "cancelled"].includes(statusKey(o.account.status))),
    [orders],
  );

  const releaseFunds = async (order: { pubkey: PublicKey; account: Record<string, unknown> }) => {
    if (!escrowProgram || !wallet?.publicKey) return;
    try {
      const tradeId = order.account.tradeId as number[] | Uint8Array;
      const [escrowVault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), Buffer.from(tradeId)], ESCROW_PROGRAM_ID);
      const [vaultAuthority] = PublicKey.findProgramAddressSync([Buffer.from("authority")], ESCROW_PROGRAM_ID);
      await escrowProgram.methods
        .releaseFunds(Array.from(tradeId))
        .accounts({
          caller: wallet.publicKey,
          tradeAccount: order.pubkey,
          escrowVault,
          sellerTokenAccount: new PublicKey(sellerTokenAccount),
          vaultAuthority,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "release failed");
    }
  };

  const openDispute = async (order: { pubkey: PublicKey; account: Record<string, unknown> }) => {
    if (!escrowProgram || !wallet?.publicKey) return;
    try {
      const tradeId = order.account.tradeId as number[] | Uint8Array;
      await escrowProgram.methods
        .openDispute(Array.from(tradeId))
        .accounts({
          disputer: wallet.publicKey,
          tradeAccount: order.pubkey,
        })
        .rpc();
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "open dispute failed");
    }
  };

  const cancelTrade = async (order: { pubkey: PublicKey; account: Record<string, unknown> }) => {
    if (!escrowProgram || !wallet?.publicKey) return;
    try {
      const tradeId = order.account.tradeId as number[] | Uint8Array;
      const [escrowVault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), Buffer.from(tradeId)], ESCROW_PROGRAM_ID);
      const [vaultAuthority] = PublicKey.findProgramAddressSync([Buffer.from("authority")], ESCROW_PROGRAM_ID);
      await escrowProgram.methods
        .cancelTrade(Array.from(tradeId))
        .accounts({
          buyer: wallet.publicKey,
          tradeAccount: order.pubkey,
          escrowVault,
          buyerTokenAccount: new PublicKey(buyerTokenAccount),
          vaultAuthority,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "cancel trade failed");
    }
  };

  return (
    <main style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem" }}>
      <h1>Buyer Dashboard</h1>
      <p>Track shipment progress, release funds, or dispute/cancel if shipment conditions fail.</p>
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <div style={{ display: "grid", gap: "0.5rem", marginTop: "1rem" }}>
        <input
          placeholder="Buyer USDC token account (for cancel)"
          value={buyerTokenAccount}
          onChange={(e) => setBuyerTokenAccount(e.target.value)}
        />
        <input
          placeholder="Seller USDC token account (for release)"
          value={sellerTokenAccount}
          onChange={(e) => setSellerTokenAccount(e.target.value)}
        />
      </div>

      <section style={{ marginTop: "1.5rem", display: "grid", gap: "0.75rem" }}>
        <h2>Active Orders</h2>
        {activeOrders.map((order) => {
          const status = statusKey(order.account.status);
          const deadline = Number(order.account.shipByDeadline ?? 0);
          const tracking = optionalString(order.account.trackingId);
          const invoiceCid = optionalString(order.account.invoiceCid);
          return (
            <OrderCard
              key={order.pubkey.toBase58()}
              title={`Seller ${(order.account.seller as PublicKey).toBase58().slice(0, 6)}...`}
              amountLabel={`${(Number(order.account.amount ?? 0) / 1_000_000).toFixed(2)} USDC`}
              status={status}
              trackingId={tracking}
            >
              {invoiceCid && (
                <a href={`https://gateway.pinata.cloud/ipfs/${invoiceCid}`} target="_blank" rel="noreferrer">
                  View Invoice
                </a>
              )}
              {status === "awaitingShipment" && <div>Waiting for seller to ship ({countdown(deadline)} left)</div>}
              {status === "inTransit" && (
                <TrackingTimeline
                  milestones={[
                    { label: "Order Created", status: "completed" },
                    { label: "Funds Locked", status: "completed" },
                    { label: "Seller Shipped", status: "completed" },
                    { label: "In Transit", status: "active" },
                    { label: "Out for Delivery", status: "pending" },
                    { label: "Delivered", status: "pending" },
                    { label: "Funds Released", status: "pending" },
                  ]}
                />
              )}
              {status === "verified" && (
                <button onClick={() => void releaseFunds(order)}>Release Funds</button>
              )}
              {(status === "awaitingShipment" || status === "inTransit") && (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={() => void openDispute(order)}>Open Dispute</button>
                  {status === "awaitingShipment" && Math.floor(Date.now() / 1000) > deadline && (
                    <button onClick={() => void cancelTrade(order)}>Cancel</button>
                  )}
                </div>
              )}
            </OrderCard>
          );
        })}
      </section>
    </main>
  );
}
