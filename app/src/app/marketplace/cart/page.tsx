'use client';

import { useCart } from "@/hooks/useCart";
import Link from "next/link";

export default function CartPage() {
  const { items, removeItem, updateQty, totalUsdc } = useCart();

  return (
    <main className="page-container" style={{ maxWidth: 700 }}>
      <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "1.75rem" }}>
        🛒 Cart
      </h1>

      {items.length === 0 ? (
        <div className="glass" style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--text-muted)" }}>
          <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>🛒</div>
          <p style={{ marginBottom: "1.25rem" }}>Your cart is empty.</p>
          <Link href="/marketplace" className="btn-primary" style={{ textDecoration: "none" }}>
            Browse Marketplace →
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {items.map((item) => (
            <div key={item.listingPubkey} className="glass" style={{ padding: "1rem", display: "grid", gap: "0.6rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Link
                  href={`/marketplace/listing/${item.listingPubkey}`}
                  style={{ fontWeight: 700, color: "var(--text-primary)", textDecoration: "none", fontSize: "0.95rem" }}
                >
                  {item.title}
                </Link>
                <button
                  onClick={() => removeItem(item.listingPubkey)}
                  aria-label={`Remove ${item.title} from cart`}
                  style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: "0.82rem" }}
                >
                  Remove
                </button>
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                ${(item.priceUsdc / 1_000_000).toFixed(2)} USDC per unit
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <button
                  onClick={() => updateQty(item.listingPubkey, item.quantity - 1)}
                  aria-label="Decrease quantity"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    borderRadius: "var(--radius-sm)",
                    width: 30,
                    height: 30,
                    cursor: "pointer",
                  }}
                >
                  −
                </button>
                <span style={{ fontWeight: 600, minWidth: 28, textAlign: "center", color: "var(--text-primary)" }}>{item.quantity}</span>
                <button
                  onClick={() => updateQty(item.listingPubkey, item.quantity + 1)}
                  aria-label="Increase quantity"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    borderRadius: "var(--radius-sm)",
                    width: 30,
                    height: 30,
                    cursor: "pointer",
                  }}
                >
                  +
                </button>
                <span style={{ marginLeft: "auto", fontWeight: 700, color: "var(--cyan)" }}>
                  ${((item.priceUsdc * item.quantity) / 1_000_000).toFixed(2)} USDC
                </span>
              </div>
            </div>
          ))}

          <div
            style={{
              borderTop: "1px solid var(--border)",
              paddingTop: "1rem",
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 700,
              fontSize: "1.1rem",
              color: "var(--text-primary)",
            }}
          >
            <span>Total</span>
            <span style={{ color: "var(--cyan)" }}>${(totalUsdc / 1_000_000).toFixed(2)} USDC</span>
          </div>

          <Link
            href="/marketplace/checkout"
            className="btn-primary"
            style={{ display: "block", textAlign: "center", fontSize: "1rem", padding: "0.85rem", textDecoration: "none" }}
          >
            🔒 Proceed to Checkout
          </Link>
        </div>
      )}
    </main>
  );
}

