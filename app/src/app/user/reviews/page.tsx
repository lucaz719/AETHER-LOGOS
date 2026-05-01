'use client';

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function UserReviewsPage() {
  const { publicKey } = useWallet();

  if (!publicKey) {
    return (
      <main style={{ textAlign: "center", paddingTop: "4rem" }}>
        <h2 style={{ color: "var(--text-primary)", marginBottom: "0.5rem" }}>My Reviews</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>Connect your wallet to view and manage reviews.</p>
        <WalletMultiButton />
      </main>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)" }}>My Reviews</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.75rem" }}>
        {["Given", "Received"].map((tab) => (
          <button key={tab} style={{ padding: "0.4rem 1rem", borderRadius: "var(--radius-sm)", background: tab === "Given" ? "var(--cyan-dim)" : "transparent", color: tab === "Given" ? "var(--cyan)" : "var(--text-secondary)", border: tab === "Given" ? "1px solid rgba(0,212,255,0.2)" : "1px solid transparent", cursor: "pointer", fontSize: "0.875rem", fontWeight: tab === "Given" ? 600 : 400 }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Empty state */}
      <div className="glass" style={{ padding: "3rem", textAlign: "center", borderRadius: "var(--radius-lg)" }}>
        <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>★</div>
        <p style={{ color: "var(--text-muted)", marginBottom: "0.5rem" }}>No reviews yet.</p>
        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>After completing a purchase, you can leave a review for the vendor.</p>
      </div>

      {/* Review guidelines */}
      <div className="glass" style={{ padding: "1.25rem", borderRadius: "var(--radius-md)", marginTop: "1.5rem" }}>
        <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.75rem" }}>Review Guidelines</h3>
        <ul style={{ fontSize: "0.82rem", color: "var(--text-secondary)", display: "grid", gap: "0.4rem", paddingLeft: "1.2rem" }}>
          <li>Reviews can be left after an order reaches "Delivered" status</li>
          <li>Be honest and describe your experience accurately</li>
          <li>Ratings are on a 1–5 star scale</li>
          <li>Reviews help other buyers make informed decisions</li>
        </ul>
      </div>
    </div>
  );
}
