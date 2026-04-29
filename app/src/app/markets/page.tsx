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
  const [selectedSide, setSelectedSide] = useState<"yes" | "no">("yes");
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

  const placeHedge = async () => {
    if (!marketProgram || !wallet?.publicKey) return;
    try {
      setError(null);
      const [hedgePosition] = PublicKey.findProgramAddressSync(
        [Buffer.from("position"), new PublicKey(marketAccount).toBuffer(), wallet.publicKey.toBuffer()],
        MARKET_PROGRAM_ID,
      );
      await marketProgram.methods
        .placeHedge(selectedSide === "yes" ? { yes: {} } : { no: {} }, new BN(Math.floor(Number(stakeAmount) * 1_000_000)))
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
  const yesOdds = total === 0 ? 50 : (onChainStats.yes / total) * 100;
  const noOdds = total === 0 ? 50 : (onChainStats.no / total) * 100;

  return (
    <main className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#12121a]/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white">Hedge Markets</h1>
              <p className="text-gray-400 mt-2">Trade risk prediction markets and hedge against logistics volatility</p>
            </div>
            <WalletMultiButton />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Market Setup */}
        <div className="bg-[#12121a] border border-white/10 rounded-xl p-8 mb-12">
          <h2 className="text-2xl font-bold text-white mb-8">Market Configuration</h2>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-3">Market Account</label>
              <input
                type="text"
                placeholder="Market address"
                value={marketAccount}
                onChange={(e) => setMarketAccount(e.target.value)}
                className="w-full bg-[#0a0a0f] border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition text-xs"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-3">Shipment Twin</label>
              <input
                type="text"
                placeholder="Twin address"
                value={shipmentTwin}
                onChange={(e) => setShipmentTwin(e.target.value)}
                className="w-full bg-[#0a0a0f] border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition text-xs"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-3">Market Vault</label>
              <input
                type="text"
                placeholder="Vault address"
                value={marketVault}
                onChange={(e) => setMarketVault(e.target.value)}
                className="w-full bg-[#0a0a0f] border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition text-xs"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-3">Your USDC Token Account</label>
              <input
                type="text"
                placeholder="Token account"
                value={userTokenAccount}
                onChange={(e) => setUserTokenAccount(e.target.value)}
                className="w-full bg-[#0a0a0f] border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition text-xs"
              />
            </div>
          </div>
        </div>

        {/* Market Overview */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Live Odds */}
          <div className="bg-[#12121a] border border-white/10 rounded-xl p-8">
            <h3 className="text-lg font-bold text-white mb-8">Live Market Odds</h3>

            <div className="space-y-6">
              {/* YES odds */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-green-400 font-semibold">YES Delivery</span>
                  <span className="text-2xl font-bold text-white">{yesOdds.toFixed(1)}%</span>
                </div>
                <div className="h-3 bg-[#0a0a0f] rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300"
                    style={{ width: `${yesOdds}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">{onChainStats.yes.toLocaleString()} USDC wagered</p>
              </div>

              {/* NO odds */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-red-400 font-semibold">NO Delivery</span>
                  <span className="text-2xl font-bold text-white">{noOdds.toFixed(1)}%</span>
                </div>
                <div className="h-3 bg-[#0a0a0f] rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-300"
                    style={{ width: `${noOdds}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">{onChainStats.no.toLocaleString()} USDC wagered</p>
              </div>
            </div>

            {marketsResponse && (
              <p className="text-xs text-gray-500 mt-8 border-t border-white/10 pt-4">
                Last updated: {new Date(marketsResponse.updatedAt).toLocaleTimeString()}
              </p>
            )}
          </div>

          {/* Place Hedge Form */}
          <div className="bg-[#12121a] border border-white/10 rounded-xl p-8">
            <h3 className="text-lg font-bold text-white mb-8">Place Hedge</h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">Stake Amount (USDC)</label>
                <input
                  type="number"
                  placeholder="e.g., 100"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="w-full bg-[#0a0a0f] border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition"
                />
              </div>

              {/* Prediction Toggle */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">Your Prediction</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSelectedSide("yes")}
                    className={`py-3 px-4 rounded-lg font-semibold transition ${
                      selectedSide === "yes"
                        ? "bg-green-500/30 border border-green-500 text-green-300"
                        : "bg-[#0a0a0f] border border-white/10 text-gray-400 hover:border-white/20"
                    }`}
                  >
                    YES - Delivered
                  </button>
                  <button
                    onClick={() => setSelectedSide("no")}
                    className={`py-3 px-4 rounded-lg font-semibold transition ${
                      selectedSide === "no"
                        ? "bg-red-500/30 border border-red-500 text-red-300"
                        : "bg-[#0a0a0f] border border-white/10 text-gray-400 hover:border-white/20"
                    }`}
                  >
                    NO - Not Delivered
                  </button>
                </div>
              </div>

              {/* Payout Display */}
              <div className="bg-[#0a0a0f] border border-white/10 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-2">Your potential payout at current odds</p>
                <p className="text-2xl font-bold text-white">
                  {((Number(stakeAmount) / (selectedSide === "yes" ? yesOdds : noOdds)) * 100).toFixed(2)} USDC
                </p>
              </div>

              <button
                onClick={() => void placeHedge()}
                disabled={!wallet}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition shadow-lg hover:shadow-purple-500/50 shadow-purple-500/20"
              >
                Place Hedge
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
