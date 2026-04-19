'use client';

import { useEffect, useState } from "react";
import { BN } from "@coral-xyz/anchor";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { useAnchorClient } from "@/hooks/useAnchorClient";
import { MARKET_PROGRAM_ID } from "@/lib/anchor";

type MarketApiResponse = {
  markets: Array<Record<string, unknown>>;
  updatedAt: string;
};

export default function MarketsPage() {
  const { marketProgram, wallet } = useAnchorClient();
  const [marketsResponse, setMarketsResponse] = useState<MarketApiResponse | null>(null);
  const [marketAccount, setMarketAccount] = useState("");
  const [shipmentTwin, setShipmentTwin] = useState("");
  const [marketVault, setMarketVault] = useState("");
  const [userTokenAccount, setUserTokenAccount] = useState("");
  const [stakeAmount, setStakeAmount] = useState("1");
  const [onChainStats, setOnChainStats] = useState<{ yes: number; no: number }>({ yes: 0, no: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/markets");
      const json = (await res.json()) as MarketApiResponse;
      setMarketsResponse(json);
    };
    void load();
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      if (!marketProgram || !marketAccount) return;
      try {
        const market = (await (marketProgram.account as any).marketAccount.fetch(
          new PublicKey(marketAccount),
        )) as Record<string, unknown>;
        setOnChainStats({
          yes: Number(market.totalYes ?? 0),
          no: Number(market.totalNo ?? 0),
        });
      } catch {
        setOnChainStats({ yes: 0, no: 0 });
      }
    };
    void loadStats();
  }, [marketAccount, marketProgram]);

  const placeHedge = async (side: "yes" | "no") => {
    if (!marketProgram || !wallet?.publicKey) return;
    try {
      setError(null);
      const [hedgePosition] = PublicKey.findProgramAddressSync(
        [Buffer.from("position"), new PublicKey(marketAccount).toBuffer(), wallet.publicKey.toBuffer()],
        MARKET_PROGRAM_ID,
      );
      await marketProgram.methods
        .placeHedge(side === "yes" ? { yes: {} } : { no: {} }, new BN(Math.floor(Number(stakeAmount) * 1_000_000)))
        .accounts({
          user: wallet.publicKey,
          marketAccount: new PublicKey(marketAccount),
          hedgePosition,
          marketVault: new PublicKey(marketVault),
          userTokenAccount: new PublicKey(userTokenAccount),
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();
    } catch (e) {
      setError(e instanceof Error ? e.message : "place hedge failed");
    }
  };

  const total = onChainStats.yes + onChainStats.no;
  const yesOdds = total === 0 ? 0 : (onChainStats.yes / total) * 100;
  const noOdds = total === 0 ? 0 : (onChainStats.no / total) * 100;

  return (
    <main style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <h1>Hedge Markets</h1>
      <WalletMultiButton />
      <p>Trade risk prediction markets and hedge against logistics volatility.</p>
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <section style={{ marginTop: "2rem" }}>
        <h2>Open Markets</h2>
        <p>API updated: {marketsResponse?.updatedAt ?? "loading..."}</p>
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <input placeholder="Market account" value={marketAccount} onChange={(e) => setMarketAccount(e.target.value)} />
          <input placeholder="Shipment twin pubkey" value={shipmentTwin} onChange={(e) => setShipmentTwin(e.target.value)} />
          <input placeholder="Market vault token account" value={marketVault} onChange={(e) => setMarketVault(e.target.value)} />
          <input placeholder="Your USDC token account" value={userTokenAccount} onChange={(e) => setUserTokenAccount(e.target.value)} />
          <input placeholder="Stake amount (USDC)" value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} />
          <div>Live odds — Yes: {yesOdds.toFixed(2)}% / No: {noOdds.toFixed(2)}%</div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={() => void placeHedge("yes")} disabled={!wallet}>Place Hedge (Yes)</button>
            <button onClick={() => void placeHedge("no")} disabled={!wallet}>Place Hedge (No)</button>
          </div>
        </div>
      </section>
    </main>
  );
}
