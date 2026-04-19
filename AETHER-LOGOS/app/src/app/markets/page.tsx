"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAnchor } from '../../lib/anchor/useAnchor';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { USDC_MINT } from '../../lib/constants';
import { 
  getMarketPda, 
  getMarketVaultPda, 
  getMarketAuthorityPda, 
  getPositionPda 
} from '../../lib/anchor/pda';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Navigation, 
  Info,
  ChevronRight,
  Plus
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

export default function MarketsDashboard() {
  const { predictionMarketProgram: program, wallet } = useAnchor();
  
  // State
  const [amount, setAmount] = useState('50');
  const [side, setSide] = useState<'long' | 'short'>('long');
  const [shipmentTwin, setShipmentTwin] = useState('');
  const [activeMarkets, setActiveMarkets] = useState<any[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (program) {
      fetchMarkets();
    }
  }, [program]);

  const fetchMarkets = async () => {
    try {
      if (!program) return;
      const markets = await program.account.marketAccount.all();
      setActiveMarkets(markets);
    } catch (err) {
      console.error("Failed to fetch markets:", err);
    }
  };

  const handlePlaceHedge = async (targetMarket?: any) => {
    if (!wallet.publicKey || !program) return;
    
    try {
      setStatus('loading');
      setErrorMessage('');

      let marketPubkey: PublicKey;
      let twinPubkey: PublicKey;

      if (targetMarket) {
        marketPubkey = targetMarket.publicKey;
        twinPubkey = targetMarket.account.shipmentTwin;
      } else {
        try {
          twinPubkey = new PublicKey(shipmentTwin);
          const [mPda] = getMarketPda(twinPubkey);
          marketPubkey = mPda;
        } catch (e) {
          throw new Error("Invalid Shipment Twin Address");
        }
      }

      const amountUSDC = Math.floor(parseFloat(amount) * 1_000_000);
      const [vaultPda] = getMarketVaultPda(marketPubkey);
      const [authorityPda] = getMarketAuthorityPda(marketPubkey);
      const [positionPda] = getPositionPda(marketPubkey, wallet.publicKey);
      const userAta = getAssociatedTokenAddressSync(USDC_MINT, wallet.publicKey);

      // We need to check if the market exists, if not, we create it first for the demo
      const marketAccount = await program.provider.connection.getAccountInfo(marketPubkey);
      
      if (!marketAccount) {
        console.log("Creating market first...");
        await program.methods
          .createMarket(
            `Delivery for ${shipmentTwin.slice(0, 8)}...`,
            new (program.provider as any).anchor.BN(Math.floor(Date.now() / 1000) + 86400 * 7),
            100 // 1% fee
          )
          .accounts({
            creator: wallet.publicKey,
            shipmentTwin: twinPubkey,
            marketAccount: marketPubkey,
            marketVault: vaultPda,
            marketAuthority: authorityPda,
            usdcMint: USDC_MINT,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: SYSVAR_RENT_PUBKEY,
          } as any)
          .rpc();
      }

      const tx = await program.methods
        .placeHedge(
          { [side === 'long' ? 'yes' : 'no']: {} } as any, 
          new (program.provider as any).anchor.BN(amountUSDC)
        )
        .accounts({
          user: wallet.publicKey,
          marketAccount: marketPubkey,
          hedgePosition: positionPda,
          marketVault: vaultPda,
          userTokenAccount: userAta,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        } as any)
        .rpc();

      console.log("Transaction success:", tx);
      setStatus('success');
      fetchMarkets();
      setTimeout(() => setStatus('idle'), 5000);
      
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.message || "Transaction failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#050510] text-[#f8fafc] font-sans selection:bg-fuchsia-500/30">
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-black/20 backdrop-blur-xl border-b border-white/5 flex items-center justify-between">
        <Link href="/" className="group flex items-center gap-2 no-underline">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-fuchsia-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(192,38,211,0.5)]">
            <Navigation className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            AETHER-LOGOS
          </span>
        </Link>
        
        <div className="flex items-center gap-6">
          <Link href="/trades" className="text-sm font-medium text-slate-400 hover:text-white transition-colors no-underline">
            Trade Escrows
          </Link>
          <WalletMultiButtonDynamic />
        </div>
      </header>

      <main className="pt-32 pb-20 px-6 max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-10 h-10 text-fuchsia-400 opacity-80" />
              <h1 className="text-5xl font-black tracking-tight leading-none">
                Hedge <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">Markets</span>
              </h1>
            </div>
            <p className="text-xl text-slate-400 max-w-2xl leading-relaxed">
              Offset supply chain volatility. Place binary hedges on shipment performance metrics, 
              guaranteed by <span className="text-white font-medium">real-time IoT and carrier telematics</span>.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex gap-4 p-2 bg-white/5 rounded-2xl border border-white/10"
          >
            <div className="px-6 py-3 text-center border-r border-white/10">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Value Locked</p>
              <p className="text-xl font-black text-cyan-400">$1.2M+</p>
            </div>
            <div className="px-6 py-3 text-center">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Active Hedges</p>
              <p className="text-xl font-black text-fuchsia-400">842</p>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Controls */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-4 space-y-6"
          >
            <div className="bg-[#0a0a1a] border border-white/5 rounded-3xl p-8 backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <ShieldCheck className="w-32 h-32 text-white" />
              </div>
              
              <h2 className="text-xl font-bold mb-8 flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-400" />
                Open New Hedge
              </h2>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Shipment Twin (NFT Address)</label>
                  <input 
                    type="text" 
                    value={shipmentTwin}
                    onChange={(e) => setShipmentTwin(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 font-mono text-xs focus:outline-none focus:border-fuchsia-500/50 transition-all placeholder:text-slate-700"
                    placeholder="Enter Twin Address..."
                  />
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 p-2 bg-white/5 rounded-lg border border-white/5">
                    <Info className="w-3 h-3" />
                    Markets are bound to a specific Shipment digital twin.
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Amount (USDC)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-xl font-black focus:outline-none focus:border-fuchsia-500/50 transition-all"
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 font-bold text-slate-500">USDC</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setSide('long')}
                    className={cn(
                      "py-4 rounded-2xl flex flex-col items-center gap-1 transition-all border-2",
                      side === 'long' 
                        ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]" 
                        : "bg-white/5 border-transparent text-slate-500 hover:bg-white/10"
                    )}
                  >
                    <TrendingUp className="w-6 h-6" />
                    <span className="text-xs font-black uppercase tracking-widest">In-Time</span>
                  </button>
                  <button 
                    onClick={() => setSide('short')}
                    className={cn(
                      "py-4 rounded-2xl flex flex-col items-center gap-1 transition-all border-2",
                      side === 'short' 
                        ? "bg-rose-500/10 border-rose-500/50 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.1)]" 
                        : "bg-white/5 border-transparent text-slate-500 hover:bg-white/10"
                    )}
                  >
                    <TrendingDown className="w-6 h-6" />
                    <span className="text-xs font-black uppercase tracking-widest">Delayed</span>
                  </button>
                </div>

                <AnimatePresence>
                  {status === 'error' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] leading-tight"
                    >
                      {errorMessage}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button 
                  onClick={() => handlePlaceHedge()}
                  disabled={status === 'loading' || !wallet.publicKey}
                  className={cn(
                    "w-full py-5 rounded-2xl font-black text-lg tracking-wider uppercase transition-all",
                    status === 'loading' 
                      ? "bg-slate-800 text-slate-500" 
                      : "bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white hover:scale-[1.02] shadow-[0_0_40px_rgba(192,38,211,0.2)]"
                  )}
                >
                  {status === 'loading' ? "Confirming..." : "Execute Hedge"}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Active Markets Table */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-8"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <Navigation className="w-6 h-6 text-fuchsia-400" />
                Active Liquidity Pools
              </h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium text-emerald-500 uppercase tracking-widest">Oracle Stream Live</span>
              </div>
            </div>

            <div className="space-y-4">
              {activeMarkets.length > 0 ? (
                activeMarkets.map((market, i) => (
                  <div 
                    key={market.publicKey.toBase58()}
                    className="group relative bg-[#0a0a1a] border border-white/5 rounded-3xl p-8 hover:border-white/20 transition-all"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="px-2 py-1 bg-white/5 rounded border border-white/10 text-[10px] font-mono text-slate-500">
                            ID: {market.publicKey.toBase58().slice(0, 8)}...
                          </div>
                          <div className="px-2 py-1 bg-fuchsia-500/10 rounded border border-fuchsia-500/20 text-[10px] font-bold text-fuchsia-400 uppercase tracking-widest">
                            Verified Twin
                          </div>
                        </div>
                        <h4 className="text-2xl font-black font-mono tracking-tighter">
                          {(market.account.totalYes.toNumber() + market.account.totalNo.toNumber()) / 1_000_000} <span className="text-slate-500 text-sm">USDC TVL</span>
                        </h4>
                        <div className="flex items-center gap-8">
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">In-Time Pools</p>
                            <p className="text-lg font-bold text-emerald-400">{market.account.totalYes.toNumber() / 1_000_000} USDC</p>
                          </div>
                          <div className="h-8 w-[1px] bg-white/5" />
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Delay Pools</p>
                            <p className="text-lg font-bold text-rose-400">{market.account.totalNo.toNumber() / 1_000_000} USDC</p>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 space-y-3">
                        <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Market Odds</p>
                          <div className="flex items-center justify-between gap-6">
                            <span className="text-xs font-black text-emerald-400">1.84x</span>
                            <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-emerald-500 to-rose-500" style={{ width: '65%' }} />
                            </div>
                            <span className="text-xs font-black text-rose-400">2.12x</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => handlePlaceHedge(market)}
                          className="w-full bg-white text-black font-black uppercase text-xs tracking-widest py-3 rounded-xl hover:bg-fuchsia-400 transition-colors flex items-center justify-center gap-2"
                        >
                          Trade This Pool
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="border border-dashed border-white/5 rounded-3xl p-20 text-center">
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                    <BarChart3 className="w-10 h-10 text-slate-700" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-400 mb-2">No Active Markets</h4>
                  <p className="text-slate-600 text-sm max-w-sm mx-auto">
                    Global logistics markets appear empty. Initialize a new market using a Shipment Twin to start hedging.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
