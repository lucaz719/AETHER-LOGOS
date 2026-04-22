'use client';

import { useState } from "react";
import { useCart } from "@/hooks/useCart";
import { useCheckout } from "@/hooks/useCheckout";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";

type Step = "review" | "approve" | "confirm" | "done";

export function CheckoutFlow() {
  const { items, totalUsdc, clearCart } = useCart();
  const { checkout, state, error, txSigs } = useCheckout();
  const { connected } = useWallet();
  const [step, setStep] = useState<Step>("review");

  const handlePlaceOrders = async () => {
    setStep("approve");
    await checkout(items);
    if (state !== "error") {
      clearCart();
      setStep("done");
    }
  };

  if (step === "done" || (state === "done")) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <div style={{ fontSize: "3rem" }}>✅</div>
        <h2>Order placed successfully!</h2>
        <p style={{ color: "#64748b" }}>
          {txSigs.length} order(s) created. USDC locked in escrow vault.
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "1rem" }}>
          <Link
            href="/marketplace/orders"
            style={{
              padding: "0.6rem 1.2rem",
              background: "#1e293b",
              color: "#fff",
              borderRadius: 8,
              textDecoration: "none",
            }}
          >
            View Orders
          </Link>
          <Link
            href="/marketplace"
            style={{
              padding: "0.6rem 1.2rem",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              textDecoration: "none",
              color: "#334155",
            }}
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", display: "grid", gap: "1.5rem" }}>
      <h2 style={{ margin: 0 }}>Checkout</h2>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "1rem", background: "#f8fafc", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}>
          Order Summary
        </div>
        {items.map((item) => (
          <div
            key={item.listingPubkey}
            style={{
              padding: "0.75rem 1rem",
              display: "flex",
              justifyContent: "space-between",
              borderBottom: "1px solid #f1f5f9",
              fontSize: "0.9rem",
            }}
          >
            <div>
              <div>{item.title}</div>
              <div style={{ color: "#64748b", fontSize: "0.8rem" }}>Qty: {item.quantity}</div>
            </div>
            <div style={{ fontWeight: 600 }}>
              ${((item.priceUsdc * item.quantity) / 1_000_000).toFixed(2)} USDC
            </div>
          </div>
        ))}
        <div
          style={{
            padding: "0.75rem 1rem",
            display: "flex",
            justifyContent: "space-between",
            fontWeight: 700,
          }}
        >
          <span>Total</span>
          <span>${(totalUsdc / 1_000_000).toFixed(2)} USDC</span>
        </div>
      </div>

      <div
        style={{
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: 8,
          padding: "0.75rem 1rem",
          fontSize: "0.85rem",
          color: "#1e40af",
        }}
      >
        🔒 Funds will be locked in the escrow vault on the Solana blockchain. They are released to the seller upon verified delivery.
      </div>

      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            padding: "0.75rem",
            color: "#dc2626",
            fontSize: "0.85rem",
          }}
        >
          {error}
        </div>
      )}

      {!connected ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
          <p style={{ color: "#64748b", fontSize: "0.9rem", margin: 0 }}>Connect your wallet to complete checkout</p>
          <WalletMultiButton />
        </div>
      ) : (
        <button
          onClick={handlePlaceOrders}
          disabled={items.length === 0 || state === "signing" || state === "confirming"}
          style={{
            padding: "0.75rem",
            background: "#1e293b",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: items.length === 0 || state === "signing" || state === "confirming" ? "not-allowed" : "pointer",
            fontSize: "1rem",
            fontWeight: 600,
            opacity: items.length === 0 ? 0.5 : 1,
          }}
        >
          {state === "signing" ? "Waiting for signature…" : state === "confirming" ? "Confirming…" : "Place Order & Lock Funds"}
        </button>
      )}
    </div>
  );
}
