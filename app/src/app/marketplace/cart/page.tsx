'use client';

import { useState } from "react";
import { CartDrawer } from "@/components/CartDrawer";
import { useCart } from "@/hooks/useCart";
import Link from "next/link";

export default function CartPage() {
  const { items, removeItem, updateQty, totalUsdc } = useCart();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <main style={{ maxWidth: 700, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1 style={{ marginBottom: "1.5rem" }}>Shopping Cart</h1>

      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🛒</div>
          <p>Your cart is empty.</p>
          <Link href="/marketplace" style={{ color: "#2563eb", textDecoration: "none" }}>
            Browse Marketplace →
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {items.map((item) => (
            <div key={item.listingPubkey} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "1rem", display: "grid", gap: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Link href={`/marketplace/listing/${item.listingPubkey}`} style={{ fontWeight: 600, color: "#1e293b", textDecoration: "none" }}>
                  {item.title}
                </Link>
                <button onClick={() => removeItem(item.listingPubkey)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.85rem" }}>Remove</button>
              </div>
              <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
                ${(item.priceUsdc / 1_000_000).toFixed(2)} USDC per unit
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <button onClick={() => updateQty(item.listingPubkey, item.quantity - 1)} style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "0.2rem 0.7rem", cursor: "pointer" }}>−</button>
                <span>{item.quantity}</span>
                <button onClick={() => updateQty(item.listingPubkey, item.quantity + 1)} style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "0.2rem 0.7rem", cursor: "pointer" }}>+</button>
                <span style={{ marginLeft: "auto", fontWeight: 600 }}>${((item.priceUsdc * item.quantity) / 1_000_000).toFixed(2)} USDC</span>
              </div>
            </div>
          ))}

          <div style={{ borderTop: "2px solid #e2e8f0", paddingTop: "1rem", display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "1.1rem" }}>
            <span>Total</span>
            <span>${(totalUsdc / 1_000_000).toFixed(2)} USDC</span>
          </div>

          <Link
            href="/marketplace/checkout"
            style={{
              display: "block",
              textAlign: "center",
              padding: "0.75rem",
              background: "#1e293b",
              color: "#fff",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "1rem",
            }}
          >
            Proceed to Checkout
          </Link>
        </div>
      )}
    </main>
  );
}
