'use client';

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useAnchorClient } from "@/hooks/useAnchorClient";
import { useMarketplaceOrders } from "@/hooks/useMarketplaceOrders";
import { useInterval } from "@/hooks/useInterval";
import { OrderStatusStepper } from "@/components/OrderStatusStepper";
import { FileText } from "lucide-react";

const CARRIERS = ["DHL", "FedEx", "UPS", "Maersk", "USPS"];

function shortKey(k: string) { return `${k.slice(0, 6)}…${k.slice(-4)}`; }

export default function StoreOrdersPage() {
  const { storeId: _storeId } = useParams<{ storeId: string }>();
  const { publicKey } = useWallet();
  const { marketProgram } = useAnchorClient();
  const { orders, loading, reload } = useMarketplaceOrders("vendor", publicKey?.toBase58());
  const [trackingInputs, setTrackingInputs] = useState<Record<string, { trackingId: string; carrier: string }>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [trackingErrors, setTrackingErrors] = useState<Record<string, string>>({});

  useInterval(() => { if (publicKey) reload(); }, 10_000);

  const updateTracking = (key: string, field: "trackingId" | "carrier", value: string) => {
    setTrackingInputs((prev) => ({ ...prev, [key]: { ...(prev[key] ?? { trackingId: "", carrier: "DHL" }), [field]: value } }));
  };

  const handleSubmitTracking = async (orderPubkey: string, tradeAccount: string, escrowTradeId: number[]) => {
    if (!marketProgram || !publicKey) return;
    const input = trackingInputs[orderPubkey] ?? { trackingId: "", carrier: "DHL" };
    if (!input.trackingId) return;
    setSubmitting(orderPubkey);
    setTrackingErrors((prev) => ({ ...prev, [orderPubkey]: "" }));
    try {
      const { PublicKey } = await import("@solana/web3.js");
      const tradeKey = new PublicKey(tradeAccount);
      const carrierObj: Record<string, Record<string, never>> = {};
      carrierObj[(input.carrier || "DHL").toLowerCase()] = {};
      const { getEscrowProgram } = await import("@/lib/anchor");
      const ep = getEscrowProgram((marketProgram as any).provider);
      await (ep.methods as any)
        .submitTracking(escrowTradeId, input.trackingId, carrierObj)
        .accounts({ seller: publicKey, tradeAccount: tradeKey })
        .rpc();
      await reload();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setTrackingErrors((prev) => ({ ...prev, [orderPubkey]: msg }));
    } finally { setSubmitting(null); }
  };

  if (!publicKey) {
    return <div style={{ textAlign: "center", paddingTop: "4rem" }}><WalletMultiButton /></div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)" }}>Orders</h1>
        <button className="btn-ghost" style={{ fontSize: "0.85rem" }} onClick={() => reload()}>↻ Refresh</button>
      </div>

      {loading ? (
        <div style={{ color: "var(--text-muted)", padding: "2rem" }}>Loading orders…</div>
      ) : orders.length === 0 ? (
        <div className="glass" style={{ padding: "3rem", textAlign: "center", borderRadius: "var(--radius-lg)" }}>
          <div style={{ marginBottom: "0.75rem", display: "flex", justifyContent: "center" }}>
            <FileText size={40} color="var(--text-muted)" />
          </div>
          <p style={{ color: "var(--text-muted)" }}>No orders yet.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {orders.map((o) => {
            const status = Object.keys(o.account.status as Record<string, unknown>)[0] ?? "Created";
            const tradeAccount = typeof o.account.trade_account === "string" ? o.account.trade_account : "";
            const escrowTradeId = o.account.escrow_trade_id as number[] | undefined;
            const needsShipment = status === "EscrowLocked";
            const input = trackingInputs[o.pubkey] ?? { trackingId: "", carrier: "DHL" };
            const tErr = trackingErrors[o.pubkey];
            return (
              <div key={o.pubkey} className="glass" style={{ padding: "1.25rem", borderRadius: "var(--radius-md)", display: "grid", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>Order <span className="addr">{shortKey(o.pubkey)}</span></div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                      Qty: {String(o.account.quantity ?? "")} · <span style={{ color: "var(--cyan)" }}>${(Number(o.account.total_amount ?? 0) / 1_000_000).toFixed(2)} USDC</span>
                    </div>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Buyer: <span className="addr">{shortKey(typeof o.account.buyer === "string" ? o.account.buyer : "")}</span></div>
                </div>
                <OrderStatusStepper orderStatus={status} />
                {needsShipment && (
                  <div style={{ display: "grid", gap: "0.5rem" }}>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", flexWrap: "wrap" }}>
                      <div style={{ display: "grid", gap: "0.3rem" }}>
                        <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)" }}>Tracking ID</label>
                        <input value={input.trackingId} onChange={(e) => updateTracking(o.pubkey, "trackingId", e.target.value)} placeholder="1Z…" maxLength={64} className="input" style={{ width: 180 }} />
                      </div>
                      <div style={{ display: "grid", gap: "0.3rem" }}>
                        <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)" }}>Carrier</label>
                        <select value={input.carrier} onChange={(e) => updateTracking(o.pubkey, "carrier", e.target.value)} className="input" style={{ width: 110 }}>
                          {CARRIERS.map((c) => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <button onClick={() => handleSubmitTracking(o.pubkey, tradeAccount, escrowTradeId ?? [])} disabled={!input.trackingId || submitting === o.pubkey} className="btn-primary" style={{ padding: "0.55rem 1rem", fontSize: "0.85rem" }}>
                        {submitting === o.pubkey ? "…" : "Submit Tracking"}
                      </button>
                    </div>
                    {tErr && <div style={{ color: "var(--red)", fontSize: "0.78rem", padding: "0.4rem 0.6rem", background: "rgba(244,63,94,0.08)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(244,63,94,0.2)" }}>{tErr}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
