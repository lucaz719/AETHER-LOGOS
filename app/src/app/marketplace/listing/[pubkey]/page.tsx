'use client';

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/hooks/useCart";
import { useVendorReviews } from "@/hooks/useVendorReviews";

type ListingData = {
  pubkey: string;
  account: Record<string, unknown>;
};

export default function ListingPage() {
  const params = useParams<{ pubkey: string }>();
  const { pubkey } = params;
  const [listing, setListing] = useState<ListingData | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();

  useEffect(() => {
    fetch(`/api/marketplace/listings/${pubkey}`)
      .then((r) => r.json())
      .then((d) => setListing(d))
      .catch(() => {});
  }, [pubkey]);

  if (!listing) return <main style={{ padding: "2rem" }}>Loading…</main>;
  const { account } = listing;
  const priceUsdc = Number(account.price_usdc ?? 0);
  const minQty = Number(account.min_order_qty ?? 1);
  const maxQty = account.max_order_qty ? Number(account.max_order_qty) : undefined;
  const vendorAuthority = typeof account.vendor === "string" ? account.vendor : "";
  const category = Object.keys(account.category as Record<string, unknown>)[0] ?? "Other";
  const imagesCid = account.images_cid as string | undefined;

  const handleAddToCart = () => {
    addItem({
      listingPubkey: pubkey,
      vendorPubkey: pubkey,
      vendorAuthority,
      title: String(account.title ?? ""),
      priceUsdc,
      quantity: qty,
      imagesCid,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1rem" }}>
      <Link href="/marketplace" style={{ color: "#64748b", textDecoration: "none", fontSize: "0.9rem" }}>
        ← Back to Marketplace
      </Link>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "2rem", marginTop: "1.5rem" }}>
        <div>
          {imagesCid ? (
            <img
              src={`https://gateway.pinata.cloud/ipfs/${imagesCid}`}
              alt={String(account.title ?? "")}
              style={{ width: "100%", borderRadius: 12, objectFit: "cover" }}
            />
          ) : (
            <div style={{ width: "100%", height: 320, background: "#f1f5f9", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "4rem" }}>
              📦
            </div>
          )}
        </div>

        <div style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#7c3aed", fontWeight: 600, marginBottom: "0.3rem" }}>{category}</div>
            <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.4rem" }}>{String(account.title ?? "")}</h1>
            <p style={{ margin: "0 0 1rem", color: "#64748b", lineHeight: 1.6 }}>{String(account.description ?? "")}</p>
          </div>

          <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#1e293b" }}>
            ${(priceUsdc / 1_000_000).toFixed(2)} <span style={{ fontSize: "1rem", color: "#64748b" }}>USDC</span>
          </div>

          {minQty > 1 && <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Minimum order: {minQty} units</div>}
          {maxQty && <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Maximum order: {maxQty} units</div>}

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button onClick={() => setQty(Math.max(minQty, qty - 1))} style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "0.3rem 0.8rem", cursor: "pointer", fontSize: "1rem" }}>−</button>
            <span style={{ fontWeight: 600, minWidth: 32, textAlign: "center" }}>{qty}</span>
            <button onClick={() => setQty(maxQty ? Math.min(maxQty, qty + 1) : qty + 1)} style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "0.3rem 0.8rem", cursor: "pointer", fontSize: "1rem" }}>+</button>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={!Boolean(account.is_active)}
            style={{
              padding: "0.75rem",
              background: added ? "#16a34a" : "#1e293b",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "1rem",
              transition: "background 0.2s",
            }}
          >
            {added ? "✓ Added to Cart" : "Add to Cart"}
          </button>

          <div style={{ fontSize: "0.8rem", color: "#94a3b8", background: "#f8fafc", borderRadius: 8, padding: "0.6rem" }}>
            🔒 Funds locked in on-chain escrow vault upon order placement
          </div>

          <Link href={`/marketplace/vendor/${vendorAuthority}`} style={{ color: "#2563eb", textDecoration: "none", fontSize: "0.85rem" }}>
            View Vendor Shop →
          </Link>
        </div>
      </div>
    </main>
  );
}
