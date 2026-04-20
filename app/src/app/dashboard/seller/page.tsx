'use client';

import { useMemo, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useAnchorClient } from "@/hooks/useAnchorClient";
import { useSellerOrders } from "@/hooks/useSellerOrders";
import { OrderCard } from "@/components/OrderCard";
import { TrackingTimeline } from "@/components/TrackingTimeline";

function statusKey(status: unknown): string {
  if (!status || typeof status !== "object") return "unknown";
  return Object.keys(status as Record<string, unknown>)[0] ?? "unknown";
}

function formatCountdown(deadline: number): string {
  const sec = Math.max(0, deadline - Math.floor(Date.now() / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${m}m`;
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

export default function SellerDashboardPage() {
  const { escrowProgram, wallet } = useAnchorClient();
  const { orders, reload } = useSellerOrders();
  const [trackingIds, setTrackingIds] = useState<Record<string, string>>({});
  const [carriers, setCarriers] = useState<Record<string, "dhl" | "fedEx" | "ups" | "maersk" | "usps">>({});
  const [error, setError] = useState<string | null>(null);

  const byStatus = useMemo(() => {
    const awaiting = orders.filter((o) => statusKey(o.account.status) === "awaitingShipment");
    const inTransit = orders.filter((o) => statusKey(o.account.status) === "inTransit");
    const completed = orders.filter((o) => statusKey(o.account.status) === "released");
    return { awaiting, inTransit, completed };
  }, [orders]);

  const submitTracking = async (order: { pubkey: PublicKey; account: Record<string, unknown> }) => {
    if (!escrowProgram || !wallet?.publicKey) return;
    const key = order.pubkey.toBase58();
    const tracking = trackingIds[key]?.trim() ?? "";
    const carrier = carriers[key] ?? "dhl";
    if (!tracking) {
      setError("Tracking ID is required");
      return;
    }
    try {
      setError(null);
      const tradeId = order.account.tradeId as number[] | Uint8Array;
      await escrowProgram.methods
        .submitTracking(Array.from(tradeId), tracking, { [carrier]: {} })
        .accounts({
          seller: wallet.publicKey,
          tradeAccount: order.pubkey,
        })
        .rpc();
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "submit tracking failed");
    }
  };

  return (
    <main style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem" }}>
      <h1>Seller Dashboard</h1>
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <section style={{ marginTop: "1.5rem", display: "grid", gap: "0.75rem" }}>
        <h2>New Orders</h2>
        {byStatus.awaiting.map((order) => {
          const key = order.pubkey.toBase58();
          const amount = Number(order.account.amount ?? 0) / 1_000_000;
          const deadline = Number(order.account.shipByDeadline ?? 0);
          const invoiceCid = optionalString(order.account.invoiceCid);
          return (
            <OrderCard
              key={key}
              title={`Buyer ${(order.account.buyer as PublicKey).toBase58().slice(0, 6)}...`}
              amountLabel={`${amount.toFixed(2)} USDC (LOCKED ✅)`}
              status="awaitingShipment"
            >
              {invoiceCid && (
                <a href={`https://gateway.pinata.cloud/ipfs/${invoiceCid}`} target="_blank" rel="noreferrer">
                  View Invoice
                </a>
              )}
              <div>Ship by: {formatCountdown(deadline)}</div>
              <div>Funds auto-refund in {formatCountdown(deadline)} if not shipped</div>
              <select
                value={carriers[key] ?? "dhl"}
                onChange={(e) => setCarriers((prev) => ({ ...prev, [key]: e.target.value as "dhl" | "fedEx" | "ups" | "maersk" | "usps" }))}
              >
                <option value="dhl">DHL</option>
                <option value="fedEx">FedEx</option>
                <option value="ups">UPS</option>
                <option value="maersk">Maersk</option>
                <option value="usps">USPS</option>
              </select>
              <input
                placeholder="Tracking ID"
                value={trackingIds[key] ?? ""}
                onChange={(e) => setTrackingIds((prev) => ({ ...prev, [key]: e.target.value }))}
              />
              <button onClick={() => void submitTracking(order)}>Submit Tracking</button>
            </OrderCard>
          );
        })}
      </section>

      <section style={{ marginTop: "1.5rem", display: "grid", gap: "0.75rem" }}>
        <h2>Active Shipments</h2>
        {byStatus.inTransit.map((order) => (
          (() => {
            const invoiceCid = optionalString(order.account.invoiceCid);
            return (
          <OrderCard
            key={order.pubkey.toBase58()}
            title={`Order ${order.pubkey.toBase58().slice(0, 8)}...`}
            amountLabel={`${(Number(order.account.amount ?? 0) / 1_000_000).toFixed(2)} USDC`}
            status="inTransit"
            trackingId={optionalString(order.account.trackingId)}
          >
            {invoiceCid && (
              <a href={`https://gateway.pinata.cloud/ipfs/${invoiceCid}`} target="_blank" rel="noreferrer">
                View Invoice
              </a>
            )}
            <TrackingTimeline
              milestones={[
                { label: "Order Created", status: "completed" },
                { label: "Seller Shipped", status: "completed" },
                { label: "In Transit", status: "active" },
                { label: "Delivered", status: "pending" },
              ]}
            />
          </OrderCard>
            );
          })()
        ))}
      </section>

      <section style={{ marginTop: "1.5rem", display: "grid", gap: "0.75rem" }}>
        <h2>Completed</h2>
        {byStatus.completed.map((order) => (
          (() => {
            const invoiceCid = optionalString(order.account.invoiceCid);
            return (
          <OrderCard
            key={order.pubkey.toBase58()}
            title={`Order ${order.pubkey.toBase58().slice(0, 8)}...`}
            amountLabel={`${(Number(order.account.amount ?? 0) / 1_000_000).toFixed(2)} USDC received`}
            status="released"
            trackingId={optionalString(order.account.trackingId)}
          >
            {invoiceCid && (
              <a href={`https://gateway.pinata.cloud/ipfs/${invoiceCid}`} target="_blank" rel="noreferrer">
                View Invoice
              </a>
            )}
          </OrderCard>
            );
          })()
        ))}
      </section>
    </main>
  );
}
