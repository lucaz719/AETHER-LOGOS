"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';

// Dynamically import WalletMultiButton to prevent hydration errors during SSR
const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

export default function Home() {
  const { connected, publicKey } = useWallet();

  return (
    <>
      <header className="nav-header">
        <Link href="/" className="nav-logo glow-text">AETHER-LOGOS</Link>
        <div>
          <WalletMultiButtonDynamic />
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '4rem 2rem' }}>
        <section style={{ textAlign: 'center', marginBottom: '5rem' }}>
          <h1 className="glow-text animate-float" style={{ fontSize: '4rem', margin: '0 0 1rem 0' }}>
            Future of Trade Settlement
          </h1>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 2rem auto', lineHeight: '1.6' }}>
            AETHER-LOGOS is an asset-light framework leveraging strict deterministic math to settle real-world events. Combining Solana smart contracts with zkTLS cryptography.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <Link href="/trades">
              <button className="premium-btn">Launch Escrow Client</button>
            </Link>
            <Link href="/markets">
              <button className="premium-btn" style={{ background: 'rgba(30, 30, 50, 0.8)', color: 'white' }}>View Hedging Markets</button>
            </Link>
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          <div className="glass-panel">
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🛡️</div>
            <h3 style={{ margin: '0 0 1rem 0', color: 'white' }}>Cryptographic Proofs</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
              Verify delivery APIs directly on-chain using Reclaim Protocol's zkTLS proofs. No oracle trust required.
            </p>
          </div>

          <div className="glass-panel">
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚡</div>
            <h3 style={{ margin: '0 0 1rem 0', color: 'white' }}>Instant Liquidity</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
              Prediction markets seamlessly integrate, allowing counterparties to hedge delivery risks with automated proportional payouts.
            </p>
          </div>

          <div className="glass-panel">
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🌐</div>
            <h3 style={{ margin: '0 0 1rem 0', color: 'white' }}>Global Standard</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
              Built for speed and composability. Escrows release identically in 400ms across all global jurisdictions.
            </p>
          </div>
        </div>

        {connected && (
          <div className="glass-panel" style={{ marginTop: '4rem', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 1rem 0' }} className="glow-text">System Status: Online</h3>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              Wallet connected: {publicKey?.toBase58().substring(0, 6)}...{publicKey?.toBase58().slice(-4)}
            </p>
            <div style={{ 
              width: '12px', height: '12px', 
              background: 'var(--solana-green)', 
              borderRadius: '50%', 
              margin: '1rem auto 0 auto',
              animation: 'pulse-glow 2s infinite'
            }} />
          </div>
        )}
      </main>
    </>
  );
}
