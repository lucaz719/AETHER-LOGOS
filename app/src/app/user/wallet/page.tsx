'use client';

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

const DEVNET_USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

export default function UserWalletPage() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!publicKey || !connection) { setLoading(false); return; }
    const load = async () => {
      try {
        const [solLamports] = await Promise.all([
          connection.getBalance(publicKey),
        ]);
        setSolBalance(solLamports / LAMPORTS_PER_SOL);

        try {
          const { getAssociatedTokenAddress } = await import("@solana/spl-token");
          const ata = await getAssociatedTokenAddress(new PublicKey(DEVNET_USDC_MINT), publicKey);
          const accountInfo = await connection.getTokenAccountBalance(ata);
          setUsdcBalance(accountInfo.value.uiAmount ?? 0);
        } catch {
          setUsdcBalance(0);
        }
      } catch { /* offline */ }
      finally { setLoading(false); }
    };
    load();
  }, [publicKey, connection]);

  if (!publicKey) {
    return (
      <main style={{ textAlign: "center", paddingTop: "4rem" }}>
        <h2 style={{ color: "var(--text-primary)", marginBottom: "0.5rem" }}>Wallet</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>Connect your wallet to view balances.</p>
        <WalletMultiButton />
      </main>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "1.5rem" }}>Wallet</h1>

      <div style={{ fontFamily: "monospace", fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1.5rem", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
        {publicKey.toBase58()}
      </div>

      {/* Balances */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>
        <div className="glass" style={{ padding: "1.5rem", borderRadius: "var(--radius-lg)" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>SOL Balance</div>
          <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "var(--violet)", marginTop: "0.5rem" }}>
            {loading ? "…" : (solBalance ?? 0).toFixed(4)}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>SOL</div>
        </div>
        <div className="glass" style={{ padding: "1.5rem", borderRadius: "var(--radius-lg)" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>USDC Balance</div>
          <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "var(--green)", marginTop: "0.5rem" }}>
            {loading ? "…" : (usdcBalance ?? 0).toFixed(2)}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>USDC</div>
        </div>
      </div>

      {/* Network info */}
      <div className="glass" style={{ padding: "1.25rem", borderRadius: "var(--radius-md)", marginBottom: "1.5rem" }}>
        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Network</div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
          <span style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>Solana Devnet</span>
        </div>
      </div>

      {/* USDC faucet helper */}
      <div className="glass" style={{ padding: "1.25rem", borderRadius: "var(--radius-md)" }}>
        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Devnet USDC Faucet</div>
        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
          Need test USDC? Use the Solana devnet USDC faucet to get tokens for testing.
        </p>
        <div style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "var(--cyan)", padding: "0.5rem 0.75rem", background: "var(--cyan-dim)", borderRadius: "var(--radius-sm)", wordBreak: "break-all" }}>
          Mint: {DEVNET_USDC_MINT}
        </div>
      </div>
    </div>
  );
}
