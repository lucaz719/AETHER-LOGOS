'use client';

import { useCallback, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import { useAnchorClient } from "@/hooks/useAnchorClient";
import { MARKETPLACE_PROGRAM_ID, ESCROW_PROGRAM_ID } from "@/lib/anchor";
import { useMarketplaceOrders } from "@/hooks/useMarketplaceOrders";
import { VendorDashboardNav } from "@/components/VendorDashboardNav";
import { OrderStatusStepper } from "@/components/OrderStatusStepper";

function shortKey(k: string) { return `${k.slice(0, 6)}…${k.slice(-4)}`; }

export default function VendorOrdersPage() {
  const { publicKey } = useWallet();
  const { marketplaceProgram } = useAnchorClient();
  const { orders, loading, reload } = useMarketplaceOrders("vendor", publicKey?.toBase58());
  const [trackingInputs, setTrackingInputs] = useState<Record<string, { trackingId: string; carrier: string }>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const updateTracking = useCallback((key: string, field: "trackingId" | "carrier", value: string) => {
    setTrackingInputs((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  }, []);

  const handleSubmitTracking = useCallback(
    async (orderPubkey: string, tradeAccount: string, escrowTradeId: number[]) => {
      if (!marketplaceProgram || !publicKey) return;
      const input = trackingInputs[orderPubkey];
      if (!input?.trackingId) return;
      setSubmitting(orderPubkey);
      try {
        const escrowProgram = (marketplaceProgram as any).provider.connection;
        const tradeKey = new PublicKey(tradeAccount);
        const carrier = input.carrier || "DHL";
        const carrierObj: Record<string, Record<string, never>> = {};
        carrierObj[carrier.toLowerCase()] = {};

        // Use the existing escrow program's submit_tracking via the anchor client
        const { getEscrowProgram } = await import("@/lib/anchor");
        const ep = getEscrowProgram((marketplaceProgram as any).provider);
        await (ep.methods as any)
          .submitTracking(escrowTradeId, input.trackingId, carrierObj)
          .accounts({ seller: publicKey, tradeAccount: tradeKey })
          .rpc();
        await reload();
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : String(e));
      } finally {
        setSubmitting(null);
      }
    },
    [marketplaceProgram, publicKey, trackingInputs, reload],
  );

  if (!publicKey) {
    return (
      <main style={{ maxWidth: 700, margin: "0 auto", padding: "3rem 1rem", textAlign: "center" }}>
        <h1>Vendor Orders</h1>
        <WalletMultiButton />
      </main>
    );
  }

  const CARRIERS = ["DHL", "FedEx", "UPS", "Maersk", "USPS"];

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1rem", display: "flex", gap: "2rem" }}>
      <VendorDashboardNav active="/vendor/orders" />
      <div style={{ flex: 1 }}>
        <h1 style={{ margin: "0 0 1.5rem" }}>Incoming Orders</h1>
        {loading ? (
          <p style={{ color: "#94a3b8" }}>Loading…</p>
        ) : orders.length === 0 ? (
          <p style={{ color: "#94a3b8" }}>No orders yet.</p>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {orders.map((o) => {
              const status = Object.keys(o.account.status as Record<string, unknown>)[0] ?? "Created";
              const tradeAccount = typeof o.account.trade_account === "string" ? o.account.trade_account : "";
              const escrowTradeId = o.account.escrow_trade_id as number[] | undefined;
              const needsShipment = status === "EscrowLocked";
              const input = trackingInputs[o.pubkey] ?? { trackingId: "", carrier: "DHL" };

              return (
                <div key={o.pubkey} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "1rem", display: "grid", gap: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>Order {shortKey(o.pubkey)}</div>
                      <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                        Qty: {String(o.account.quantity ?? "")} · ${(Number(o.account.total_amount ?? 0) / 1_000_000).toFixed(2)} USDC
                      </div>
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Buyer: {shortKey(typeof o.account.buyer === "string" ? o.account.buyer : "")}</div>
                  </div>
                  <OrderStatusStepper orderStatus={status} />

                  {needsShipment && (
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
                      <div>
                        <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.2rem" }}>Tracking ID</label>
                        <input
                          value={input.trackingId}
                          onChange={(e) => updateTracking(o.pubkey, "trackingId", e.target.value)}
                          placeholder="1Z…"
                          maxLength={64}
                          style={{ padding: "0.4rem 0.6rem", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.85rem" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.2rem" }}>Carrier</label>
                        <select
                          value={input.carrier}
                          onChange={(e) => updateTracking(o.pubkey, "carrier", e.target.value)}
                          style={{ padding: "0.4rem 0.6rem", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.85rem" }}
                        >
                          {CARRIERS.map((c) => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <button
                        onClick={() => handleSubmitTracking(o.pubkey, tradeAccount, escrowTradeId ?? [])}
                        disabled={!input.trackingId || submitting === o.pubkey}
                        style={{
                          padding: "0.45rem 1rem",
                          background: "#1e293b",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontSize: "0.85rem",
                        }}
                      >
                        {submitting === o.pubkey ? "…" : "Submit Tracking"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
