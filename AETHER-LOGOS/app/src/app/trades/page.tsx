"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAnchor } from '../../lib/anchor/useAnchor';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { USDC_MINT, AGENT_URL } from '../../lib/constants';
import { getTradePda, getVaultPda, getVaultAuthorityPda } from '../../lib/anchor/pda';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Package, Truck, Lock, AlertCircle, CheckCircle2, Navigation } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility to merge tailwind classes safely.
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

export default function TradesDashboard() {
  const { tradeEscrowProgram: program, wallet } = useAnchor();
  
  // Form State
  const [amount, setAmount] = useState('100');
  const [carrier, setCarrier] = useState('DHL');
  const [trackingId, setTrackingId] = useState('');
  const [sellerAddress, setSellerAddress] = useState('');
  
  // UI State
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeEscrows, setActiveEscrows] = useState<any[]>([]);
  const [shippingStatuses, setShippingStatuses] = useState<Record<string, string>>({});

  // Fetch active escrows on load
  useEffect(() => {
    if (program && wallet.publicKey) {
      fetchEscrows();
    }
  }, [program, wallet.publicKey, status]); // Re-fetch on status change

  // Poll agent for shipping statuses
  useEffect(() => {
    if (activeEscrows.length === 0) return;
    
    const fetchStatuses = async () => {
      const newStatuses = { ...shippingStatuses };
      for (const escrow of activeEscrows) {
        const tId = escrow.account.trackingId;
        if (!tId) continue;
        try {
          const res = await fetch(`${AGENT_URL}/status?tracking_id=${tId}`);
          if (res.ok) {
            const data = await res.json();
            newStatuses[tId] = data.status || 'Registered';
          }
        } catch (e) {
          // ignore
        }
      }
      setShippingStatuses(newStatuses);
    };

    fetchStatuses();
    const interval = setInterval(fetchStatuses, 5000);
    return () => clearInterval(interval);
  }, [activeEscrows]);

  const fetchEscrows = async () => {
    try {
      if (!program) return;
      const trades = await program.account.tradeAccount.all();
      // Filter for trades where user is buyer or seller
      const userTrades = trades.filter((t: any) => 
        t.account.buyer.equals(wallet.publicKey!) || 
        t.account.seller.equals(wallet.publicKey!)
      );
      setActiveEscrows(userTrades);
    } catch (err) {
      console.error("Failed to fetch escrows:", err);
    }
  };

  const handleSubmitProof = async (trade: any) => {
    if (!wallet.publicKey || !program) return;
    try {
      setStatus('loading');
      const mockProof = Array.from(Buffer.from("zkTLS-MOCK-PROOF-DELIVERED"));
      
      await program.methods
        .submitProof(trade.account.tradeId, Buffer.from(mockProof))
        .accounts({
          submitter: wallet.publicKey,
          tradeAccount: trade.publicKey,
        } as any)
        .rpc();

      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.message || "Proof submission failed");
    }
  };

  const handleReleaseFunds = async (trade: any) => {
    if (!wallet.publicKey || !program) return;
    try {
      setStatus('loading');
      
      const [vaultPda] = getVaultPda(trade.account.tradeId);
      const [vaultAuthorityPda] = getVaultAuthorityPda();
      const sellerAta = getAssociatedTokenAddressSync(USDC_MINT, trade.account.seller);

      await program.methods
        .releaseFunds(trade.account.tradeId)
        .accounts({
          caller: wallet.publicKey,
          tradeAccount: trade.publicKey,
          escrowVault: vaultPda,
          vaultAuthority: vaultAuthorityPda,
          sellerTokenAccount: sellerAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        } as any)
        .rpc();

      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.message || "Fund release failed");
    }
  };

  const handleCreateEscrow = async () => {
    if (!wallet.publicKey || !program) return;
    
    try {
      setStatus('loading');
      setErrorMessage('');

      // Validation
      let sellerPubkey: PublicKey;
      try {
        sellerPubkey = new PublicKey(sellerAddress);
      } catch (e) {
        throw new Error("Invalid Seller Address");
      }

      const amountUSDC = Math.floor(parseFloat(amount) * 1_000_000); // 6 decimals
      const tradeId = Array.from(crypto.getRandomValues(new Uint8Array(16)));
      
      // PDA Derivation
      const [tradePda] = getTradePda(wallet.publicKey, tradeId);
      const [vaultPda] = getVaultPda(tradeId);
      const [vaultAuthorityPda] = getVaultAuthorityPda();
      
      const buyerAta = getAssociatedTokenAddressSync(USDC_MINT, wallet.publicKey);

      // Milestone Hash (Mock for demo: SHA-256 of "DELIVERED")
      const enc = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", enc.encode("DELIVERED"));
      const milestoneHash = Array.from(new Uint8Array(hashBuffer));

      const tx = await program.methods
        .createTrade(
          tradeId,
          new (program.provider as any).anchor.BN(amountUSDC),
          milestoneHash,
          trackingId,
          { [carrier.toLowerCase() === 'ups' ? 'ups' : carrier]: {} } as any
        )
        .accounts({
          buyer: wallet.publicKey,
          seller: sellerPubkey,
          tradeAccount: tradePda,
          escrowVault: vaultPda,
          vaultAuthority: vaultAuthorityPda,
          buyerTokenAccount: buyerAta,
          usdcMint: USDC_MINT,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        } as any)
        .rpc();

      console.log("Transaction success:", tx);
      
      try {
        await fetch(`${AGENT_URL}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tracking_id: trackingId,
            wallet: wallet.publicKey.toBase58(),
            callback_url: "http://localhost:3000/api/callback",
            carrier: carrier
          })
        });
        console.log("Registered with Go Agent");
      } catch (e) {
        console.error("Failed to register with agent:", e);
      }

      setStatus('success');
      fetchEscrows();
      
      // Auto reset success after 5s
      setTimeout(() => setStatus('idle'), 5000);
      
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.message || "Transaction failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#050510] text-[#f8fafc] font-sans selection:bg-cyan-500/30">
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-black/20 backdrop-blur-xl border-b border-white/5 flex items-center justify-between">
        <Link href="/" className="group flex items-center gap-2 no-underline">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-fuchsia-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(6,182,212,0.5)]">
            <Navigation className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            AETHER-LOGOS
          </span>
        </Link>
        
        <div className="flex items-center gap-6">
          <Link href="/markets" className="text-sm font-medium text-slate-400 hover:text-white transition-colors no-underline">
            Prediction Markets
          </Link>
          <WalletMultiButtonDynamic />
        </div>
      </header>

      <main className="pt-32 pb-20 px-6 max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-10 h-10 text-cyan-400 opacity-80" />
            <h1 className="text-5xl font-black tracking-tight leading-none">
              Trade <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">Escrow</span>
            </h1>
          </div>
          <p className="text-xl text-slate-400 max-w-2xl leading-relaxed">
            Cryptographic payment enforcement. Funds are locked on-chain and only released when 
            <span className="text-white font-medium ml-1">zkTLS shipping proofs</span> verify delivery status.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Create Section */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-12"
          >
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-fuchsia-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
              <div className="relative bg-[#0a0a1a] border border-white/5 rounded-3xl p-8 backdrop-blur-md">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-bold flex items-center gap-2 text-slate-200">
                    <Lock className="w-5 h-5 text-fuchsia-400" />
                    New Secure Escrow
                  </h2>
                  <div className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-widest animate-pulse">
                    zkTLS Proof Injection Active
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Payment Amount (USDC)</label>
                    <div className="relative group/input">
                      <input 
                        type="number" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xl font-medium focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-700"
                        placeholder="0.00"
                      />
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 font-bold">USDC</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Shipping Carrier</label>
                    <select 
                      value={carrier}
                      onChange={(e) => setCarrier(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xl font-medium focus:outline-none focus:border-cyan-500/50 transition-all appearance-none cursor-pointer"
                    >
                      <option value="DHL">DHL Worldwide</option>
                      <option value="FedEx">FedEx International</option>
                      <option value="UPS">UPS Logistics</option>
                      <option value="Maersk">Maersk Freight</option>
                    </select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Tracking ID (Digital Twin Ref)</label>
                    <div className="relative">
                      <Package className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                      <input 
                        type="text" 
                        value={trackingId}
                        onChange={(e) => setTrackingId(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl pl-14 pr-6 py-4 font-medium focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-700"
                        placeholder="e.g. AETHER-774421-LOGOS"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Seller Public Key</label>
                    <div className="relative">
                      <Shield className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                      <input 
                        type="text" 
                        value={sellerAddress}
                        onChange={(e) => setSellerAddress(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl pl-14 pr-6 py-4 font-mono text-sm focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-700"
                        placeholder="Enter the destination wallet address"
                      />
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {status === 'error' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3"
                    >
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      {errorMessage}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button 
                  onClick={handleCreateEscrow}
                  disabled={status === 'loading' || !wallet.publicKey}
                  className={cn(
                    "w-full py-5 rounded-2xl font-black text-lg tracking-wider uppercase transition-all flex items-center justify-center gap-3",
                    status === 'loading' 
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                      : "bg-white text-black hover:bg-cyan-400 hover:scale-[1.01] active:scale-[0.99] shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                  )}
                >
                  {status === 'loading' ? (
                    <>
                      <div className="w-5 h-5 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin" />
                      Transacting on Solana...
                    </>
                  ) : status === 'success' ? (
                    <>
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                      Trade Secured ✓
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Initialize Secure Trade
                    </>
                  )}
                </button>
                
                {!wallet.publicKey && (
                  <p className="mt-4 text-center text-xs text-slate-500 font-bold uppercase tracking-widest">
                    Wallet connection required to deploy smart contracts
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Active List Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-12"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <Truck className="w-6 h-6 text-cyan-400" />
                Active Shipments
              </h3>
              <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-lg text-xs font-mono text-slate-400">
                {activeEscrows.length} Total Escrows
              </span>
            </div>

            <div className="space-y-4">
              {activeEscrows.length > 0 ? (
                activeEscrows.map((escrow, i) => (
                  <div 
                    key={escrow.publicKey.toBase58()}
                    className="bg-[#0a0a1a] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all group"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform">
                          <Package className="w-6 h-6 text-slate-300" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{escrow.account.carrier && Object.keys(escrow.account.carrier)[0]} • {escrow.account.trackingId}</p>
                          <h4 className="text-xl font-bold font-mono">{(escrow.account.amountUsdc.toNumber() / 1_000_000).toLocaleString()} USDC</h4>
                          <p className="text-[10px] text-slate-500 font-mono mt-1">To: {escrow.account.seller.toBase58().slice(0, 4)}...{escrow.account.seller.toBase58().slice(-4)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Status</p>
                          <div className="flex items-center gap-2">
                            {escrow.account.status.locked && (
                              <>
                                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                                <span className="font-bold text-cyan-400">LOCKED</span>
                              </>
                            )}
                            {escrow.account.status.verified && (
                              <>
                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="font-bold text-emerald-400">VERIFIED</span>
                              </>
                            )}
                            {escrow.account.status.released && (
                              <>
                                <div className="w-2 h-2 rounded-full bg-slate-500" />
                                <span className="font-bold text-slate-500">RELEASED</span>
                              </>
                            )}
                          </div>
                          {shippingStatuses[escrow.account.trackingId] && (
                            <p className="text-[10px] text-fuchsia-400 font-mono mt-1 uppercase">
                              Agent: {shippingStatuses[escrow.account.trackingId]}
                            </p>
                          )}
                        </div>
                        <div className="h-10 w-[1px] bg-white/10 mx-2 hidden md:block" />
                        
                        {escrow.account.status.locked && (
                          <button 
                            onClick={() => handleSubmitProof(escrow)}
                            className={cn(
                              "px-6 py-2 rounded-xl text-sm font-bold transition-all border",
                              shippingStatuses[escrow.account.trackingId] === 'Delivered'
                                ? "bg-fuchsia-500/20 hover:bg-fuchsia-500/30 border-fuchsia-500/40 text-fuchsia-300 animate-pulse shadow-[0_0_15px_rgba(217,70,239,0.3)]"
                                : "bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/20 text-cyan-400"
                            )}
                          >
                            Verify Proof
                          </button>
                        )}
                        
                        {escrow.account.status.verified && (
                          <button 
                            onClick={() => handleReleaseFunds(escrow)}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-6 py-2 rounded-xl text-sm font-bold text-emerald-400 transition-all"
                          >
                            Release Funds
                          </button>
                        )}

                        <button className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl text-sm font-bold transition-all">
                          Manage
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center">
                  <Package className="w-12 h-12 text-slate-700 mx-auto mb-4 opacity-20" />
                  <p className="text-slate-500 font-medium">No active escrows found for this wallet.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
