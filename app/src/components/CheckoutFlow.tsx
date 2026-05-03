'use client';

import { useState } from "react";
import { useCart } from "@/hooks/useCart";
import { useCheckout } from "@/hooks/useCheckout";
import { useSolPrice, formatUsd, usdToLamports } from "@/hooks/useSolPrice";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";

type Step = "review" | "approve" | "confirm" | "done";
type PaymentMethod = "usdc" | "sol";

export function CheckoutFlow() {
  const { items, totalUsdc, clearCart } = useCart();
  const { checkout, state, error, txSigs } = useCheckout();
  const { connected } = useWallet();
  const { solPriceUsd, error: priceError } = useSolPrice();
  const [step, setStep] = useState<Step>("review");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("usdc");

  const totalUsdDecimal = totalUsdc / 1_000_000;
  const platformFeeUsd = paymentMethod === "usdc" ? totalUsdDecimal * 0.02 : totalUsdDecimal * 0.02;
  const totalWithFeeUsd = totalUsdDecimal + platformFeeUsd;
  const requiredLamports = usdToLamports(totalWithFeeUsd, solPriceUsd);

  const handlePlaceOrders = async () => {
    setStep("approve");
    await checkout(items);
    if (state !== "error") {
      clearCart();
      setStep("done");
    } else {
      setStep("review");
    }
  };

  const currentStepNum = step === "review" ? 1 : step === "approve" || state === "signing" ? 2 : step === "done" || state === "done" ? 3 : 2;

  if (step === "done" || state === "done") {
    return (
      <div style={{ maxWidth: 540, margin: "0 auto", display: "grid", gap: "1.25rem" }}>
        {/* Stepper */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
          <span style={{ color: currentStepNum >= 1 ? "var(--cyan)" : "inherit", fontWeight: currentStepNum >= 1 ? 700 : 400 }}>1. Review</span>
          <span>→</span>
          <span style={{ color: currentStepNum >= 2 ? "var(--cyan)" : "inherit", fontWeight: currentStepNum >= 2 ? 700 : 400 }}>2. Sign</span>
          <span>→</span>
          <span style={{ color: currentStepNum >= 3 ? "var(--cyan)" : "inherit", fontWeight: currentStepNum >= 3 ? 700 : 400 }}>3. Confirmed</span>
        </div>

        <div
          className="glass"
          style={{ textAlign: "center", padding: "3rem 2rem" }}
        >
          <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>✅</div>
          <h2 style={{ color: "var(--green)", marginBottom: "0.5rem" }}>Order placed!</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1rem" }}>
            {txSigs.length} order(s) created. {paymentMethod === "usdc" ? "USDC" : "SOL"} locked in escrow vault.
          </p>
          
          {txSigs.length > 0 && (
            <div style={{ marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.8rem", alignItems: "center" }}>
              {txSigs.map((sig) => (
                <a 
                  key={sig}
                  href={`https://explorer.solana.com/tx/${sig}?cluster=devnet`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: "var(--cyan)", textDecoration: "underline" }}
                >
                  View Tx: {sig.slice(0, 8)}...{sig.slice(-8)}
                </a>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "1.5rem" }}>
            <Link href="/marketplace/orders" className="btn-primary" style={{ textDecoration: "none" }}>
              View Orders
            </Link>
            <Link
              href="/marketplace"
              className="btn-ghost"
              style={{ textDecoration: "none" }}
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 540, margin: "0 auto", display: "grid", gap: "1.25rem" }}>
      {/* Stepper */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
        <span style={{ color: currentStepNum >= 1 ? "var(--cyan)" : "inherit", fontWeight: currentStepNum >= 1 ? 700 : 400 }}>1. Review</span>
        <span>→</span>
        <span style={{ color: currentStepNum >= 2 ? "var(--cyan)" : "inherit", fontWeight: currentStepNum >= 2 ? 700 : 400 }}>2. Sign</span>
        <span>→</span>
        <span style={{ color: currentStepNum >= 3 ? "var(--cyan)" : "inherit", fontWeight: currentStepNum >= 3 ? 700 : 400 }}>3. Confirmed</span>
      </div>

      <h2 style={{ color: "var(--text-primary)", margin: 0 }}>Checkout</h2>

      {/* Payment method toggle */}
      <div className="glass" style={{ padding: "1rem", display: "flex", gap: "0.75rem", borderRadius: "var(--radius-md)" }}>
        <button
          onClick={() => setPaymentMethod("usdc")}
          style={{
            flex: 1,
            padding: "0.65rem",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            background: paymentMethod === "usdc" ? "var(--cyan)" : "transparent",
            color: paymentMethod === "usdc" ? "var(--bg-base)" : "var(--text-secondary)",
            fontWeight: paymentMethod === "usdc" ? 700 : 500,
            fontSize: "0.9rem",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          💵 USDC
        </button>
        <button
          onClick={() => setPaymentMethod("sol")}
          style={{
            flex: 1,
            padding: "0.65rem",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            background: paymentMethod === "sol" ? "var(--violet)" : "transparent",
            color: paymentMethod === "sol" ? "white" : "var(--text-secondary)",
            fontWeight: paymentMethod === "sol" ? 700 : 500,
            fontSize: "0.9rem",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          ◎ SOL
        </button>
      </div>

      {/* SOL price ticker */}
      {paymentMethod === "sol" && (
        <div
          style={{
            background: "rgba(167,107,207,0.08)",
            border: "1px solid rgba(167,107,207,0.25)",
            borderRadius: "var(--radius-md)",
            padding: "0.75rem 1rem",
            fontSize: "0.82rem",
            color: "var(--violet)",
          }}
        >
          {priceError ? (
            <span>⚠️ Unable to fetch SOL price</span>
          ) : (
            <span>1 SOL = {formatUsd(solPriceUsd)}</span>
          )}
        </div>
      )}

      {/* Order summary */}
      <div className="glass" style={{ overflow: "hidden" }}>
        <div
          style={{
            padding: "0.85rem 1rem",
            background: "var(--bg-elevated)",
            fontWeight: 600,
            borderBottom: "1px solid var(--border)",
            color: "var(--text-secondary)",
            fontSize: "0.85rem",
          }}
        >
          Order Summary
        </div>
        {items.map((item) => (
          <div
            key={item.listingPubkey}
            style={{
              padding: "0.7rem 1rem",
              display: "flex",
              justifyContent: "space-between",
              borderBottom: "1px solid var(--border)",
              fontSize: "0.88rem",
            }}
          >
            <div>
              <div style={{ color: "var(--text-primary)" }}>{item.title}</div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>Qty: {item.quantity}</div>
            </div>
            <div style={{ fontWeight: 600, color: "var(--cyan)" }}>
              ${((item.priceUsdc * item.quantity) / 1_000_000).toFixed(2)}
            </div>
          </div>
        ))}

        {/* Platform fee line item */}
        <div
          style={{
            padding: "0.7rem 1rem",
            display: "flex",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--border)",
            fontSize: "0.88rem",
          }}
        >
          <span style={{ color: "var(--text-secondary)" }}>Platform Fee (2%)</span>
          <span style={{ color: "var(--amber)", fontWeight: 600 }}>
            {paymentMethod === "usdc" ? `$${platformFeeUsd.toFixed(2)}` : `$${platformFeeUsd.toFixed(2)}`}
          </span>
        </div>

        {/* Total */}
        <div
          style={{
            padding: "0.7rem 1rem",
            display: "flex",
            justifyContent: "space-between",
            fontWeight: 700,
          }}
        >
          <span style={{ color: "var(--text-secondary)" }}>Total</span>
          {paymentMethod === "usdc" ? (
            <span style={{ color: "var(--cyan)", fontSize: "1.05rem" }}>${totalWithFeeUsd.toFixed(2)} USDC</span>
          ) : (
            <span style={{ color: "var(--violet)", fontSize: "1.05rem" }}>
              {(requiredLamports / 1_000_000_000).toFixed(6)} SOL ({formatUsd(totalWithFeeUsd)})
            </span>
          )}
        </div>
      </div>

      {/* Escrow notice */}
      <div
        style={{
          background: "rgba(0,212,255,0.06)",
          border: "1px solid var(--border-accent)",
          borderRadius: "var(--radius-md)",
          padding: "0.75rem 1rem",
          fontSize: "0.82rem",
          color: "var(--cyan)",
          display: "flex",
          gap: "0.6rem",
          alignItems: "flex-start",
        }}
      >
        <span style={{ fontSize: "1.1rem" }}>🔒</span>
        <span>Funds are locked in the escrow vault on Solana and released to the seller only upon verified delivery.</span>
      </div>

      {error && (
        <div
          style={{
            background: "rgba(244,63,94,0.08)",
            border: "1px solid rgba(244,63,94,0.25)",
            borderRadius: "var(--radius-md)",
            padding: "0.75rem 1rem",
            color: "var(--red)",
            fontSize: "0.85rem",
          }}
        >
          {error}
        </div>
      )}

      {!connected ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", marginTop: "1rem" }}>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>Connect your wallet to complete checkout</p>
          <WalletMultiButton />
        </div>
      ) : (
        <button
          onClick={handlePlaceOrders}
          disabled={items.length === 0 || state === "signing" || state === "confirming"}
          className="btn-primary"
          style={{ width: "100%", fontSize: "1rem", padding: "0.85rem", marginTop: "1rem" }}
        >
          {state === "signing"
            ? "⏳ Waiting for signature…"
            : state === "confirming"
            ? "⏳ Confirming…"
            : paymentMethod === "sol"
            ? "⚡ Lock SOL & Checkout"
            : "🔒 Place Order & Lock Funds"}
        </button>
      )}
    </div>
  );
}

