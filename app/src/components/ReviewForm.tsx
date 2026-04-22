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
    return <p style={{ color: "#16a34a", fontWeight: 600 }}>✓ Review submitted!</p>;
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: "1rem" }}>
      <div>
        <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>Rating</label>
        <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.3rem" }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "1.5rem",
                color: n <= rating ? "#f59e0b" : "#d1d5db",
              }}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      <div>
        <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>Comment IPFS CID (optional)</label>
        <input
          type="text"
          value={commentCid}
          onChange={(e) => setCommentCid(e.target.value)}
          placeholder="Qm…"
          maxLength={64}
          style={{
            display: "block",
            width: "100%",
            marginTop: "0.3rem",
            padding: "0.5rem",
            border: "1px solid #e2e8f0",
            borderRadius: 6,
            fontSize: "0.9rem",
            boxSizing: "border-box",
          }}
        />
      </div>
      {error && <p style={{ color: "#dc2626", fontSize: "0.85rem", margin: 0 }}>{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        style={{
          padding: "0.6rem 1.2rem",
          background: "#1e293b",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          cursor: submitting ? "not-allowed" : "pointer",
          opacity: submitting ? 0.7 : 1,
        }}
      >
        {submitting ? "Submitting…" : "Submit Review"}
      </button>
    </form>
  );
}
