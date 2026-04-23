'use client';

import { useCallback, useState } from "react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { useAnchorClient } from "@/hooks/useAnchorClient";
import { MARKETPLACE_PROGRAM_ID } from "@/lib/anchor";

export function ReviewForm({
  vendorAuthority,
  tradeAccountPubkey,
  onSuccess,
}: {
  vendorAuthority: string;
  tradeAccountPubkey: string;
  onSuccess?: () => void;
}) {
  const { marketplaceProgram, wallet } = useAnchorClient();
  const [rating, setRating] = useState(5);
  const [commentCid, setCommentCid] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [hovered, setHovered] = useState(0);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!marketplaceProgram || !wallet?.publicKey) {
        setError("Wallet not connected");
        return;
      }
      setSubmitting(true);
      setError(null);
      try {
        const vendorAuthKey = new PublicKey(vendorAuthority);
        const tradeKey = new PublicKey(tradeAccountPubkey);
        const reviewerKey = wallet.publicKey;

        const [vendorProfilePda] = PublicKey.findProgramAddressSync(
          [Buffer.from("vendor"), vendorAuthKey.toBuffer()],
          MARKETPLACE_PROGRAM_ID,
        );
        const [reviewPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("review"), tradeKey.toBuffer(), reviewerKey.toBuffer()],
          MARKETPLACE_PROGRAM_ID,
        );

        await (marketplaceProgram.methods as any)
          .submitReview(rating, commentCid.trim() || null)
          .accounts({
            reviewer: reviewerKey,
            vendorProfile: vendorProfilePda,
            review: reviewPda,
            tradeAccount: tradeKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        setDone(true);
        onSuccess?.();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setSubmitting(false);
      }
    },
    [marketplaceProgram, wallet, vendorAuthority, tradeAccountPubkey, rating, commentCid, onSuccess],
  );

  if (done) {
    return <p className="badge badge-green" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>✓ Review submitted!</p>;
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: "1rem" }}>
      <div>
        <label style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.4rem" }}>
          Rating
        </label>
        <div style={{ display: "flex", gap: "0.2rem" }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              aria-label={`Rate ${n} star${n !== 1 ? "s" : ""}`}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "1.8rem",
                color: n <= (hovered || rating) ? "var(--amber)" : "var(--border)",
                textShadow: n <= (hovered || rating) ? "0 0 8px rgba(245,158,11,0.5)" : "none",
                transition: "color var(--transition), text-shadow var(--transition)",
                padding: "0 2px",
              }}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      <div>
        <label style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.4rem" }}>
          Comment IPFS CID <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span>
        </label>
        <input
          type="text"
          value={commentCid}
          onChange={(e) => setCommentCid(e.target.value)}
          placeholder="Qm…"
          maxLength={64}
          className="input"
        />
      </div>
      {error && (
        <p style={{ color: "var(--red)", fontSize: "0.82rem", background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: "var(--radius-sm)", padding: "0.5rem 0.75rem" }}>
          {error}
        </p>
      )}
      <button type="submit" disabled={submitting} className="btn-primary">
        {submitting ? "Submitting…" : "Submit Review"}
      </button>
    </form>
  );
}

