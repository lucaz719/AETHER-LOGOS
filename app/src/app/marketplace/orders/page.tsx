'use client';

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useMarketplaceOrders } from "@/hooks/useMarketplaceOrders";
import { useOrderCancel } from "@/hooks/useOrderCancel";
import { useInterval } from "@/hooks/useInterval";
import { OrderStatusStepper } from "@/components/OrderStatusStepper";
import { Skeleton } from "@/components/Skeleton";
import { Modal } from "@/components/Modal";
import { ReviewForm } from "@/components/ReviewForm";
import Link from "next/link";
import { useState } from "react";

function shortKey(k: string) { return `${k.slice(0, 4)}…${k.slice(-4)}`; }

export default function BuyerOrdersPage() {
  const { publicKey } = useWallet();
  const { orders, loading, reload } = useMarketplaceOrders("buyer", publicKey?.toBase58());
  const { cancelOrder, state: cancelState, error: cancelError } = useOrderCancel();

  const [reviewOrder, setReviewOrder] = useState<{pubkey: string, vendorPubkey: string, tradePubkey: string} | null>(null);

  // Poll for updates every 10 seconds if there are active orders
  useInterval(() => {
    if (publicKey) reload();
  }, 10_000);

  if (!publicKey) {
    return (
      <main className="page-container" style={{ textAlign: "center", paddingTop: "4rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔑</div>
        <h2 style={{ color: "var(--text-primary)", marginBottom: "0.5rem" }}>Connect Wallet</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>Connect your wallet to view orders.</p>
        <WalletMultiButton />
      </main>
    );
  }

  return (
    <main className="page-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)" }}>My Orders</h1>
        <Link href="/marketplace" style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: "0.85rem" }}>
          ← Marketplace
        </Link>
      </div>

      {cancelError && (
        <div
          style={{
            background: "rgba(244,63,94,0.08)",
            border: "1px solid rgba(244,63,94,0.2)",
            borderRadius: "var(--radius-md)",
            padding: "0.75rem 1rem",
            color: "var(--red)",
            fontSize: "0.85rem",
            marginBottom: "1rem",
          }}
        >
          {cancelError}
        </div>
      )}

      {loading ? (
        <div style={{ display: "grid", gap: "1rem" }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass" style={{ padding: "1rem", display: "grid", gap: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Skeleton width="30%" height={18} />
                <Skeleton width={80} height={18} />
              </div>
              <Skeleton height={40} />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="glass" style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--text-muted)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>📦</div>
          <p style={{ marginBottom: "1.25rem" }}>No orders yet.</p>
          <Link href="/marketplace" className="btn-primary" style={{ textDecoration: "none" }}>
            Browse Marketplace →
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {orders.map((o) => {
            const status = Object.keys(o.account.status as Record<string, unknown>)[0] ?? "Created";
            const tradeKey = typeof o.account.trade_account === "string" ? o.account.trade_account : "";
            const orderId = o.account.order_id as number[] | undefined;
            const canCancel = status === "Created";

            return (
              <div key={o.pubkey} className="glass" style={{ padding: "1.25rem", display: "grid", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                      Order <span className="addr">{shortKey(o.pubkey)}</span>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                      {new Date(Number(o.account.created_at ?? 0) * 1000).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ fontWeight: 700, color: "var(--cyan)", fontSize: "1rem" }}>
                      ${(Number(o.account.total_amount ?? 0) / 1_000_000).toFixed(2)} USDC
                    </div>
                    {canCancel && orderId && (
                      <button
                        onClick={async () => {
                          if (await cancelOrder(o.pubkey, orderId, tradeKey)) reload();
                        }}
                        disabled={cancelState === "signing" || cancelState === "confirming"}
                        className="btn-danger"
                      >
                        {cancelState === "signing" ? "…" : "Cancel"}
                      </button>
                    )}
                    {status === "Completed" && (
                      <button
                        onClick={() => setReviewOrder({ pubkey: o.pubkey, vendorPubkey: String(o.account.vendor ?? ""), tradePubkey: tradeKey })}
                        className="btn-primary"
                        style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
                      >
                        Leave Review
                      </button>
                    )}
                  </div>
                </div>

                <OrderStatusStepper orderStatus={status} />

                {tradeKey && (
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    Escrow:{" "}
                    <Link href="/dashboard/buyer" className="addr" style={{ color: "var(--cyan)", textDecoration: "none" }}>
                      {shortKey(tradeKey)}
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal 
        isOpen={!!reviewOrder} 
        onClose={() => setReviewOrder(null)}
        title="Leave a Review"
      >
        {reviewOrder && (
          <ReviewForm 
            vendorAuthority={reviewOrder.vendorPubkey} 
            tradeAccountPubkey={reviewOrder.tradePubkey}
            onSuccess={() => {
              reload();
              setTimeout(() => setReviewOrder(null), 2000);
            }} 
          />
        )}
      </Modal>
    </main>
  );
}

