'use client';

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/useToast";
import { Skeleton } from "@/components/Skeleton";

type ListingData = {
  pubkey: string;
  account: Record<string, unknown>;
};

export default function ListingPage() {
  const params = useParams<{ pubkey: string }>();
  const { pubkey } = params;
  const [listing, setListing] = useState<ListingData | null>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();
  const toast = useToast();

  useEffect(() => {
    fetch(`/api/marketplace/listings/${pubkey}`)
      .then((r) => r.json())
      .then((d) => { setListing(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [pubkey]);

  if (loading) {
    return (
      <main className="page-container">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "2rem", marginTop: "1.5rem" }}>
          <Skeleton height={340} />
          <div style={{ display: "grid", gap: "1rem" }}>
            <Skeleton height={22} width="40%" />
            <Skeleton height={32} />
            <Skeleton height={60} />
            <Skeleton height={42} />
          </div>
        </div>
      </main>
    );
  }
  if (!listing || !listing.account) {
    return (
      <main className="page-container" style={{ textAlign: "center", paddingTop: "4rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔍</div>
        <p style={{ color: "var(--text-muted)" }}>Listing not found.</p>
        <Link href="/marketplace" style={{ color: "var(--cyan)" }}>← Back to Marketplace</Link>
      </main>
    );
  }

  const { account } = listing;
  const priceUsdc = Number(account.price_usdc ?? 0);
  const minQty = Number(account.min_order_qty ?? 1);
  const maxQty = account.max_order_qty ? Number(account.max_order_qty) : undefined;
  const vendorAuthority = typeof account.vendor === "string" ? account.vendor : "";
  const category = Object.keys(account.category as Record<string, unknown>)[0] ?? "Other";
  const imagesCid = account.images_cid as string | undefined;
  const isActive = Boolean(account.is_active);

  const ipfsGateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs";

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
    toast.success(`Added ${qty} ${qty === 1 ? 'item' : 'items'} to cart`);
  };

  return (
    <main className="page-container">
      <Link
        href="/marketplace"
        style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
      >
        ← Back to Marketplace
      </Link>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "2.5rem", marginTop: "1.5rem" }}>
        {/* Left: Image */}
        <div>
          {imagesCid ? (
            <img
              src={`${ipfsGateway}/${imagesCid}`}
              alt={String(account.title ?? "")}
              style={{ width: "100%", borderRadius: "var(--radius-lg)", objectFit: "cover", maxHeight: 440 }}
            />
          ) : (
            <div
              className="glass"
              style={{
                width: "100%",
                height: 340,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "5rem",
                background: "linear-gradient(135deg, rgba(0,212,255,0.04), rgba(124,58,237,0.06))",
              }}
            >
              📦
            </div>
          )}
        </div>

        {/* Right: Details */}
        <div style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
          <div>
            <span className="badge badge-violet" style={{ marginBottom: "0.5rem" }}>{category}</span>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.25, marginTop: "0.4rem" }}>
              {String(account.title ?? "")}
            </h1>
            {!isActive && (
              <span className="badge badge-red" style={{ marginTop: "0.35rem" }}>Inactive</span>
            )}
          </div>

          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.9rem" }}>
            {String(account.description ?? "")}
          </p>

          <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--cyan)", letterSpacing: "-0.02em" }}>
            ${(priceUsdc / 1_000_000).toFixed(2)}
            <span style={{ fontSize: "1rem", color: "var(--text-muted)", fontWeight: 400, marginLeft: "0.35rem" }}>USDC / unit</span>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
            {minQty > 1 && <span>MOQ: <strong style={{ color: "var(--text-primary)" }}>{minQty}</strong> units</span>}
            {maxQty && <span>Max: <strong style={{ color: "var(--text-primary)" }}>{maxQty}</strong> units</span>}
            {account.stock != null && <span>Stock: <strong style={{ color: "var(--text-primary)" }}>{String(account.stock)}</strong></span>}
          </div>

          {/* Qty selector */}
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button
              onClick={() => setQty(Math.max(minQty, qty - 1))}
              aria-label="Decrease quantity"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                borderRadius: "var(--radius-sm)",
                width: 34,
                height: 34,
                cursor: "pointer",
                fontSize: "1.1rem",
              }}
            >
              −
            </button>
            <span style={{ fontWeight: 700, fontSize: "1rem", minWidth: 36, textAlign: "center", color: "var(--text-primary)" }}>{qty}</span>
            <button
              onClick={() => setQty(maxQty ? Math.min(maxQty, qty + 1) : qty + 1)}
              aria-label="Increase quantity"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                borderRadius: "var(--radius-sm)",
                width: 34,
                height: 34,
                cursor: "pointer",
                fontSize: "1.1rem",
              }}
            >
              +
            </button>
            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginLeft: "0.25rem" }}>
              = ${((priceUsdc * qty) / 1_000_000).toFixed(2)} USDC
            </span>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={!isActive}
            className={isActive ? "btn-primary" : "btn-ghost"}
            style={{
              width: "100%",
              fontSize: "1rem",
              padding: "0.85rem",
            }}
          >
            Add to Cart
          </button>

          {/* Escrow badge */}
          <div
            style={{
              background: "rgba(0,212,255,0.06)",
              border: "1px solid var(--border-accent)",
              borderRadius: "var(--radius-md)",
              padding: "0.65rem 0.9rem",
              fontSize: "0.78rem",
              color: "var(--cyan)",
              display: "flex",
              gap: "0.5rem",
            }}
          >
            🔒 USDC locked in on-chain escrow vault upon order placement
          </div>

          <Link
            href={`/marketplace/vendor/${vendorAuthority}`}
            style={{
              fontSize: "0.82rem",
              color: "var(--cyan)",
              textDecoration: "none",
            }}
          >
            View Vendor Shop →
          </Link>
        </div>
      </div>
    </main>
  );
}

