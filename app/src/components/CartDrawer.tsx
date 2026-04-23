'use client';

import { useCart } from "@/hooks/useCart";
import Link from "next/link";

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, removeItem, updateQty, totalUsdc } = useCart();

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          zIndex: 40,
        }}
      />
      {/* Drawer */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 380,
          maxWidth: "100vw",
          background: "#111827",
          border: "1px solid var(--border)",
          borderRight: "none",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1rem 1.25rem",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
            🛒 Cart
            <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: "0.85rem", marginLeft: "0.4rem" }}>
              ({items.length} items)
            </span>
          </span>
          <button
            onClick={onClose}
            aria-label="Close cart"
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              borderRadius: "var(--radius-sm)",
              width: 30,
              height: 30,
              cursor: "pointer",
              fontSize: "0.9rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem 1.25rem", display: "grid", gap: "0.6rem" }}>
          {items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text-muted)" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🛒</div>
              <p>Cart is empty</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.listingPubkey}
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.75rem",
                  display: "grid",
                  gap: "0.35rem",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)" }}>{item.title}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                  ${(item.priceUsdc / 1_000_000).toFixed(2)} USDC × {item.quantity}
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                  🔒 Locked in escrow on checkout
                </div>
                <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", marginTop: "0.25rem" }}>
                  <button
                    aria-label="Decrease quantity"
                    onClick={() => updateQty(item.listingPubkey, item.quantity - 1)}
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                      borderRadius: "var(--radius-sm)",
                      width: 26,
                      height: 26,
                      cursor: "pointer",
                      fontSize: "0.9rem",
                    }}
                  >
                    −
                  </button>
                  <span style={{ fontSize: "0.88rem", color: "var(--text-primary)", minWidth: 20, textAlign: "center" }}>{item.quantity}</span>
                  <button
                    aria-label="Increase quantity"
                    onClick={() => updateQty(item.listingPubkey, item.quantity + 1)}
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                      borderRadius: "var(--radius-sm)",
                      width: 26,
                      height: 26,
                      cursor: "pointer",
                      fontSize: "0.9rem",
                    }}
                  >
                    +
                  </button>
                  <button
                    aria-label="Remove item"
                    onClick={() => removeItem(item.listingPubkey)}
                    style={{
                      marginLeft: "auto",
                      background: "transparent",
                      border: "none",
                      color: "var(--red)",
                      cursor: "pointer",
                      fontSize: "0.78rem",
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "1rem 1.25rem",
            borderTop: "1px solid var(--border)",
            display: "grid",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "var(--text-primary)" }}>
            <span>Total</span>
            <span style={{ color: "var(--cyan)" }}>${(totalUsdc / 1_000_000).toFixed(2)} USDC</span>
          </div>
          <Link
            href="/marketplace/checkout"
            onClick={onClose}
            className={items.length === 0 ? "" : "btn-primary"}
            style={{
              display: "block",
              textAlign: "center",
              padding: "0.7rem",
              borderRadius: "var(--radius-md)",
              textDecoration: "none",
              pointerEvents: items.length === 0 ? "none" : "auto",
              opacity: items.length === 0 ? 0.4 : 1,
              background: items.length === 0 ? "var(--bg-surface)" : undefined,
              color: items.length === 0 ? "var(--text-muted)" : undefined,
            }}
          >
            Checkout
          </Link>
        </div>
      </div>
    </>
  );
}

