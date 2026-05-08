'use client';

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import Link from "next/link";
import { useAnchorClient } from "@/hooks/useAnchorClient";
import { VendorDashboardNav } from "@/components/VendorDashboardNav";
import { Skeleton } from "@/components/Skeleton";

type ListingRow = {
  pubkey: string;
  account: Record<string, unknown>;
};

export default function VendorListingsPage() {
  const { publicKey } = useWallet();
  const { marketProgram } = useAnchorClient();
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [deactivating, setDeactivating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/marketplace/listings?vendor=${publicKey.toBase58()}&limit=100`);
      if (!res.ok) return;
      const data = await res.json();
      setListings(data.listings ?? []);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => { void load(); }, [load]);

  const deactivate = useCallback(
    async (listingPubkey: string) => {
      if (!marketProgram || !publicKey) return;
      setDeactivating(listingPubkey);
      setError(null);
      try {
        await (marketProgram.methods as any)
          .deactivateListing()
          .accounts({
            authority: publicKey,
            listing: new PublicKey(listingPubkey),
          })
          .rpc();
        await load();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setDeactivating(null);
      }
    },
    [marketProgram, publicKey, load],
  );

  if (!publicKey) {
    return (
      <main className="page-container" style={{ textAlign: "center", paddingTop: "4rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>Connect</div>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>Connect your wallet to manage listings.</p>
        <WalletMultiButton />
      </main>
    );
  }

  return (
    <main className="page-container" style={{ display: "flex", gap: "2rem" }}>
      <VendorDashboardNav active="/vendor/listings" />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem" }}>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)" }}>My Listings</h1>
          <Link href="/vendor/listings/new" className="btn-primary" style={{ textDecoration: "none" }}>
            + New Listing
          </Link>
        </div>

        {error && (
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
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: "grid", gap: "0.6rem" }}>
            {[0, 1, 2].map((i) => <Skeleton key={i} height={60} />)}
          </div>
        ) : listings.length === 0 ? (
          <div className="glass" style={{ textAlign: "center", padding: "3rem 2rem", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>No listings</div>
            <p style={{ marginBottom: "1.25rem" }}>No listings yet.</p>
            <Link href="/vendor/listings/new" className="btn-primary" style={{ textDecoration: "none" }}>
              Create Your First Listing
            </Link>
          </div>
        ) : (
          <div
            className="glass"
            style={{ overflow: "hidden" }}
          >
            {/* Table header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 120px 90px 70px 90px 120px",
                gap: "0.5rem",
                padding: "0.65rem 1rem",
                background: "var(--bg-elevated)",
                borderBottom: "1px solid var(--border)",
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              <div>Title</div>
              <div>Category</div>
              <div>Price</div>
              <div>Stock</div>
              <div>Status</div>
              <div>Actions</div>
            </div>
            {listings.map((l) => {
              const category = Object.keys(l.account.category as Record<string, unknown>)[0] ?? "Other";
              const price = (Number(l.account.price_usdc ?? 0) / 1_000_000).toFixed(2);
              const stock = l.account.stock != null ? String(l.account.stock) : "∞";
              const isActive = Boolean(l.account.is_active);
              const isDeactivating = deactivating === l.pubkey;

              return (
                <div
                  key={l.pubkey}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 120px 90px 70px 90px 120px",
                    gap: "0.5rem",
                    padding: "0.75rem 1rem",
                    borderBottom: "1px solid var(--border)",
                    alignItems: "center",
                    fontSize: "0.85rem",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {String(l.account.title ?? "")}
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>{category}</div>
                  <div style={{ color: "var(--cyan)", fontWeight: 600 }}>${price}</div>
                  <div style={{ color: "var(--text-muted)" }}>{stock}</div>
                  <div>
                    <span className={isActive ? "badge badge-green" : "badge badge-red"}>
                      {isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <Link
                      href={`/vendor/listings/${l.pubkey}/edit`}
                      className="btn-ghost"
                      style={{ textDecoration: "none", padding: "0.3rem 0.6rem", fontSize: "0.78rem" }}
                    >
                      Edit
                    </Link>
                    {isActive && (
                      <button
                        onClick={() => deactivate(l.pubkey)}
                        disabled={isDeactivating}
                        className="btn-danger"
                        style={{ padding: "0.3rem 0.6rem", fontSize: "0.78rem" }}
                      >
                        {isDeactivating ? "…" : "Deactivate"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
