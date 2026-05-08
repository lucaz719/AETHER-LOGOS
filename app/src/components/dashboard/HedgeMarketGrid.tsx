'use client';

import { useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { MARKET_PROGRAM_ID } from "@/lib/anchor";
import { useAnchorClient } from "@/hooks/useAnchorClient";
import { toAtoms } from "@/lib/units";

type HedgeMarket = {
  marketType: string;
  title: string;
  yesProbability: number;
  yesLiquidity: number;
  noLiquidity: number;
  expiry: string;
  verificationSignal: string;
  riskLevel: "low" | "medium" | "high";
  marketPubkey?: string;
};

export function HedgeMarketGrid({ markets }: { markets: HedgeMarket[] }) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { marketProgram } = useAnchorClient();
  
  const [selectedMarketIdx, setSelectedMarketIdx] = useState<number | null>(null);
  const [selectedSide, setSelectedSide] = useState<"yes" | "no">("yes");
  const [stakeAmount, setStakeAmount] = useState("100");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMarket = useMemo(
    () => (selectedMarketIdx !== null ? markets[selectedMarketIdx] : null),
    [markets, selectedMarketIdx],
  );

  const handlePlaceHedge = async () => {
    if (!wallet.publicKey || !marketProgram || !selectedMarket?.marketPubkey) {
      setError("Wallet not connected or market not loaded");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const marketPubkey = new PublicKey(selectedMarket.marketPubkey);
      const amountAtoms = new BN(toAtoms(Number(stakeAmount)));
      const side = selectedSide === "yes" ? { yes: {} } : { no: {} };

      // Derive PDAs
      const [marketVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("market_vault"), marketPubkey.toBuffer()],
        MARKET_PROGRAM_ID,
      );

      const [hedgePositionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("position"), marketPubkey.toBuffer(), wallet.publicKey.toBuffer()],
        MARKET_PROGRAM_ID,
      );

      // Find user's USDC token account
      const userTokenAccounts = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, {
        mint: new PublicKey("EPjFWaLb3hyccqJ1xNJY46zsBaM0fwmJXp3mqqqZP"),
      });

      if (userTokenAccounts.value.length === 0) {
        setError("No USDC token account found. Please create one first.");
        setIsSubmitting(false);
        return;
      }

      const userTokenAccount = userTokenAccounts.value[0].pubkey;

      // Call place_hedge instruction
      const tx = await marketProgram.methods
        .placeHedge(side, amountAtoms)
        .accounts({
          user: wallet.publicKey,
          marketAccount: marketPubkey,
          hedgePosition: hedgePositionPda,
          marketVault: marketVaultPda,
          userTokenAccount,
          systemProgram: new PublicKey("11111111111111111111111111111111"),
          tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
          rent: new PublicKey("SysvarRent111111111111111111111111111111111"),
        })
        .rpc();

      console.log("✓ Hedge placed:", tx);
      setSelectedMarketIdx(null);
      setStakeAmount("100");
    } catch (err: any) {
      console.error("Hedge placement failed:", err);
      setError(err.message || "Failed to place hedge. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRiskColor = (level: "low" | "medium" | "high") => {
    if (level === "low") return "text-green-600 dark:text-green-400";
    if (level === "medium") return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getRiskBgColor = (level: "low" | "medium" | "high") => {
    if (level === "low") return "bg-green-500/10 border border-green-500/30";
    if (level === "medium") return "bg-amber-500/10 border border-amber-500/30";
    return "bg-red-500/10 border border-red-500/30";
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Hedge Markets Terminal</h2>
        <p className="text-sm text-muted-foreground mt-1">Predict logistics outcomes and hedge your exposure</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-base font-semibold text-foreground">Available Markets</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {markets.map((market, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedMarketIdx(idx)}
              className={`group relative rounded-2xl border transition-all duration-300 text-left overflow-hidden ${selectedMarketIdx === idx
                ? "border-primary bg-primary/5 shadow-2xl shadow-primary/10"
                : "border-border/50 bg-card/40 hover:border-primary/40 hover:bg-card/60"
                }`}
            >
              <div className="relative space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">{market.marketType}</p>
                    <h3 className="text-sm font-bold text-foreground leading-snug uppercase tracking-tight line-clamp-2">{market.title}</h3>
                  </div>
                  <div className={`shrink-0 rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-widest ${getRiskBgColor(market.riskLevel)}`}>
                    <span className={getRiskColor(market.riskLevel)}>{market.riskLevel}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border/50 pt-4">
                  <div>
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Liquidity</p>
                    <p className="text-xs font-black text-foreground tracking-tighter">
                      ${((market.yesLiquidity + market.noLiquidity) / 1_000_000).toLocaleString()}M
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">YES %</p>
                    <p className="text-xs font-black text-primary tracking-tighter uppercase">{market.yesProbability.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedMarket && (
        <>
          <div
            className="fixed inset-0 bg-black/20 transition-opacity duration-200 z-40 pointer-events-auto"
            onClick={() => setSelectedMarketIdx(null)}
            aria-label="Close side panel"
          />
          <div className="fixed right-0 top-24 bottom-0 w-full max-w-sm z-50 pointer-events-auto flex flex-col">
            <div className="glass-header rounded-l-2xl flex flex-col shadow-2xl h-full overflow-hidden p-6">
              <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <h3 className="font-semibold text-foreground">Place Hedge</h3>
                <button
                  onClick={() => setSelectedMarketIdx(null)}
                  className="p-1.5 hover:bg-secondary rounded-lg transition"
                  aria-label="Close"
                >
                  <span className="text-foreground">X</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                <div className="card-plain p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2">Market</p>
                  <p className="font-semibold text-foreground">{selectedMarket.title}</p>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{selectedMarket.verificationSignal}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Your Prediction</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSelectedSide("yes")}
                      className={`rounded-lg border-2 px-3 py-3 text-sm font-semibold transition-all duration-150 ${selectedSide === "yes"
                        ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400"
                        : "border-border-light bg-secondary text-muted-foreground hover:border-green-300"
                        }`}
                    >
                      YES
                    </button>
                    <button
                      onClick={() => setSelectedSide("no")}
                      className={`rounded-lg border-2 px-3 py-3 text-sm font-semibold transition-all duration-150 ${selectedSide === "no"
                        ? "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400"
                        : "border-border-light bg-secondary text-muted-foreground hover:border-red-300"
                        }`}
                    >
                      NO
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Stake Amount (USDC)</p>
                  <input
                    type="number"
                    min="1"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-border-light bg-secondary px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>

                <div className="card-elevated p-4 bg-gradient-to-br from-green-50 dark:from-green-950/20 to-green-50/50 dark:to-green-950/10 border border-green-200 dark:border-green-900/30">
                  <p className="text-xs text-muted-foreground mb-1.5 font-semibold">Potential Payout</p>
                  <p className="font-mono text-2xl font-bold text-green-700 dark:text-green-400">
                    ${(Number(stakeAmount) * (selectedSide === "yes" ? 1.55 : 2.1)).toFixed(2)}
                  </p>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-700 dark:text-red-400">
                    {error}
                  </div>
                )}
              </div>

              <div className="flex-shrink-0 border-t border-border/50 pt-4">
                <button
                  onClick={handlePlaceHedge}
                  disabled={isSubmitting || !wallet.connected}
                  className={`w-full py-3 rounded-lg font-semibold transition-all duration-200 ${
                    isSubmitting || !wallet.connected
                      ? "bg-primary/50 text-primary-foreground/50 cursor-not-allowed"
                      : "bg-primary hover:bg-primary/90 text-primary-foreground active:scale-95"
                  }`}
                >
                  {isSubmitting ? "Placing Hedge..." : wallet.connected ? "Place Hedge" : "Connect Wallet"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
