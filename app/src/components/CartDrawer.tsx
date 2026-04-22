'use client';

import { useCart } from "@/hooks/useCart";
import Link from "next/link";

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, removeItem, updateQty, totalUsdc } = useCart();

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.3)",
          zIndex: 40,
        }}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 380,
          maxWidth: "100vw",
          background: "#fff",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          boxShadow: "-4px 0 20px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1rem",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <strong>Cart ({items.length} items)</strong>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem" }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "grid", gap: "0.75rem" }}>
          {items.length === 0 ? (
            <p style={{ color: "#94a3b8", textAlign: "center", marginTop: "2rem" }}>Cart is empty</p>
          ) : (
            items.map((item) => (
              <div
                key={item.listingPubkey}
                style={{
                  border: "1px solid #f1f5f9",
                  borderRadius: 8,
                  padding: "0.75rem",
                  display: "grid",
                  gap: "0.3rem",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{item.title}</div>
                <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                  ${(item.priceUsdc / 1_000_000).toFixed(2)} USDC × {item.quantity}
                </div>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                  🔒 Will be locked in escrow vault on checkout
                </div>
                <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", marginTop: "0.3rem" }}>
                  <button
                    onClick={() => updateQty(item.listingPubkey, item.quantity - 1)}
                    style={{ border: "1px solid #e2e8f0", borderRadius: 4, padding: "0.1rem 0.5rem", cursor: "pointer" }}
                  >
                    −
                  </button>
                  <span style={{ fontSize: "0.9rem" }}>{item.quantity}</span>
                  <button
                    onClick={() => updateQty(item.listingPubkey, item.quantity + 1)}
                    style={{ border: "1px solid #e2e8f0", borderRadius: 4, padding: "0.1rem 0.5rem", cursor: "pointer" }}
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeItem(item.listingPubkey)}
                    style={{
                      marginLeft: "auto",
                      border: "none",
                      background: "none",
                      color: "#ef4444",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div
          style={{
            padding: "1rem",
            borderTop: "1px solid #e2e8f0",
            display: "grid",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
            <span>Total</span>
            <span>${(totalUsdc / 1_000_000).toFixed(2)} USDC</span>
          </div>
          <Link
            href="/marketplace/checkout"
            onClick={onClose}
            style={{
              display: "block",
              textAlign: "center",
              padding: "0.7rem",
              background: items.length === 0 ? "#e2e8f0" : "#1e293b",
              color: items.length === 0 ? "#94a3b8" : "#fff",
              borderRadius: 8,
              textDecoration: "none",
              pointerEvents: items.length === 0 ? "none" : "auto",
            }}
          >
            Checkout
          </Link>
        </div>
      </div>
    </>
  );
}
