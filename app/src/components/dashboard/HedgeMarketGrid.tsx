'use client';

import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { CheckCircle, ExternalLink, X, Zap } from "lucide-react";

export type HedgeMarket = {
  id: string;
  marketPubkey: string;
  category: string;
  question: string;
  risk: 'HIGH' | 'MEDIUM' | 'LOW';
  liquidity: number;
  yesLiquidity: number;
  noLiquidity: number;
  yesPercent: number;
  resolveDate: string;
};

type SuccessState = {
  tx: string;
  side: 'YES' | 'NO';
  amount: number;
  payout: number;
  market: string;
};

function calcPayout(stake: number, side: 'YES' | 'NO', market: HedgeMarket): number {
  const prob = side === 'YES' ? market.yesPercent / 100 : (100 - market.yesPercent) / 100;
  const impliedOdds = 1 / prob;
  return Math.round(stake * impliedOdds * 0.95 * 100) / 100; // 5% protocol fee
}

function fakeTxHash(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789';
  return Array.from({ length: 88 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function RiskBadge({ risk }: { risk: 'HIGH' | 'MEDIUM' | 'LOW' }) {
  const map: Record<string, React.CSSProperties> = {
    HIGH:   { color: '#f87171', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)' },
    MEDIUM: { color: '#f59e0b', background: 'rgba(245,158,11,0.12)',  border: '1px solid rgba(245,158,11,0.3)'  },
    LOW:    { color: '#34d399', background: 'rgba(52,211,153,0.12)',  border: '1px solid rgba(52,211,153,0.3)'  },
  };
  return (
    <span style={{
      ...map[risk],
      fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase',
      letterSpacing: '0.1em', padding: '0.2rem 0.55rem', borderRadius: '999px',
    }}>{risk}</span>
  );
}

export function HedgeMarketGrid({ markets }: { markets: HedgeMarket[] }) {
  const wallet = useWallet();

  const [selectedIdx, setSelectedIdx]     = useState<number | null>(null);
  const [selectedSide, setSelectedSide]   = useState<'YES' | 'NO'>('YES');
  const [stakeAmount, setStakeAmount]     = useState('100');
  const [busy, setBusy]                   = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [success, setSuccess]             = useState<SuccessState | null>(null);

  const selectedMarket = useMemo(
    () => (selectedIdx !== null ? markets[selectedIdx] : null),
    [markets, selectedIdx],
  );

  const potentialPayout = useMemo(() => {
    if (!selectedMarket) return 0;
    const stake = Number(stakeAmount);
    if (!stake || stake <= 0) return 0;
    return calcPayout(stake, selectedSide, selectedMarket);
  }, [selectedMarket, selectedSide, stakeAmount]);

  // Auto-dismiss success toast after 6s
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 6000);
    return () => clearTimeout(t);
  }, [success]);

  const closePanel = () => { setSelectedIdx(null); setError(null); };

  const openPanel = (idx: number) => {
    setSelectedIdx(idx);
    setSelectedSide('YES');
    setStakeAmount('100');
    setError(null);
  };

  const handlePlaceHedge = async () => {
    if (!wallet.connected || !wallet.publicKey) {
      setError('Please connect your wallet to place a hedge');
      return;
    }
    if (!selectedMarket) return;

    setBusy(true);
    setError(null);

    // Demo mode: simulate 1.8s TX delay
    await new Promise(r => setTimeout(r, 1800));
    const tx = fakeTxHash();
    setSuccess({
      tx,
      side: selectedSide,
      amount: Number(stakeAmount),
      payout: potentialPayout,
      market: selectedMarket.question,
    });
    closePanel();
    setBusy(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
          <Zap size={16} color="var(--cyan)" aria-hidden="true" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Hedge Markets Terminal
          </h2>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          Predict logistics outcomes · Stake USDC · Earn proportional payouts
        </p>
      </div>

      {/* Market cards grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1rem',
        width: '100%',
      }}>
        {markets.map((market, idx) => {
          const selected = selectedIdx === idx;
          const noPercent = (100 - market.yesPercent).toFixed(1);
          const totalLiq = (market.liquidity / 1_000_000).toFixed(2);
          return (
            <button
              key={market.id}
              onClick={() => openPanel(idx)}
              aria-pressed={selected}
              style={{
                textAlign: 'left', minWidth: 0, overflow: 'hidden',
                border: `1px solid ${selected ? 'var(--cyan)' : 'var(--border)'}`,
                borderRadius: '12px', padding: '1.25rem',
                background: selected ? 'rgba(6,182,212,0.04)' : 'var(--bg-surface, rgba(255,255,255,0.03))',
                cursor: 'pointer',
                transition: 'border-color 0.15s, background 0.15s',
                boxShadow: selected ? '0 0 0 2px rgba(6,182,212,0.15)' : 'none',
              }}
              onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(6,182,212,0.45)'; }}
              onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
            >
              {/* Category + Risk */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--cyan)' }}>
                  {market.category}
                </span>
                <RiskBadge risk={market.risk} />
              </div>

              {/* Question */}
              <p style={{
                fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)',
                lineHeight: 1.4, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.01em',
              }}>
                {market.question}
              </p>

              {/* Probability bar */}
              <div style={{ marginBottom: '0.6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 700 }}>YES {market.yesPercent.toFixed(1)}%</span>
                  <span style={{ fontSize: '0.7rem', color: '#f87171', fontWeight: 700 }}>NO {noPercent}%</span>
                </div>
                <div style={{ height: '4px', borderRadius: '999px', background: 'rgba(248,113,113,0.25)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${market.yesPercent}%`,
                    background: 'linear-gradient(90deg,#34d399,#22c55e)',
                    borderRadius: '999px', transition: 'width 0.4s',
                  }} />
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                <div>
                  <p style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Liquidity</p>
                  <p style={{ fontSize: '0.88rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'monospace' }}>${totalLiq}M</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Resolves</p>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                    {new Date(market.resolveDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Side panel */}
      {selectedMarket && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)', zIndex: 40 }}
            onClick={closePanel}
            aria-label="Close hedge panel"
          />

          {/* Panel */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Place Hedge"
            style={{
              position: 'fixed', right: 0, top: 0, bottom: 0,
              width: '100%', maxWidth: '400px', zIndex: 50,
              display: 'flex', flexDirection: 'column',
              background: 'var(--background)',
              borderLeft: '1px solid var(--border)',
              boxShadow: '-20px 0 60px rgba(0,0,0,0.55)',
            }}
          >
            {/* Panel header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <p style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--cyan)', marginBottom: '0.2rem' }}>
                  {selectedMarket.category}
                </p>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>Place Hedge</h3>
              </div>
              <button
                onClick={closePanel}
                aria-label="Close"
                style={{ padding: '0.4rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '44px', minHeight: '44px' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Market info */}
              <div style={{ padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                <p style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '0.45rem' }}>Market</p>
                <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.45 }}>{selectedMarket.question}</p>
                <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.75rem' }}>
                  <div>
                    <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Liquidity</span>
                    <p style={{ fontSize: '0.8rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                      ${(selectedMarket.liquidity / 1_000_000).toFixed(2)}M USDC
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Resolves</span>
                    <p style={{ fontSize: '0.8rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                      {new Date(selectedMarket.resolveDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pool breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(52,211,153,0.2)', background: 'rgba(52,211,153,0.05)' }}>
                  <p style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', color: '#34d399', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>YES Pool</p>
                  <p style={{ fontSize: '1rem', fontWeight: 900, fontFamily: 'monospace', color: 'var(--text-primary)' }}>${(selectedMarket.yesLiquidity / 1000).toFixed(0)}K</p>
                  <p style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700 }}>{selectedMarket.yesPercent.toFixed(1)}%</p>
                </div>
                <div style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.05)' }}>
                  <p style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', color: '#f87171', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>NO Pool</p>
                  <p style={{ fontSize: '1rem', fontWeight: 900, fontFamily: 'monospace', color: 'var(--text-primary)' }}>${(selectedMarket.noLiquidity / 1000).toFixed(0)}K</p>
                  <p style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 700 }}>{(100 - selectedMarket.yesPercent).toFixed(1)}%</p>
                </div>
              </div>

              {/* YES / NO selector */}
              <div>
                <p style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>Your Prediction</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  {(['YES', 'NO'] as const).map(side => (
                    <button
                      key={side}
                      onClick={() => setSelectedSide(side)}
                      style={{
                        padding: '0.75rem', borderRadius: '8px', fontWeight: 800,
                        fontSize: '0.9rem', cursor: 'pointer', minHeight: '44px', transition: 'border-color 0.15s, background-color 0.15s, color 0.15s',
                        border: selectedSide === side
                          ? `2px solid ${side === 'YES' ? '#34d399' : '#f87171'}`
                          : '2px solid var(--border)',
                        background: selectedSide === side
                          ? side === 'YES' ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)'
                          : 'transparent',
                        color: selectedSide === side
                          ? side === 'YES' ? '#34d399' : '#f87171'
                          : 'var(--text-muted, #64748b)',
                      }}
                    >
                      {side}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stake input */}
              <div>
                <p style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>Stake Amount (USDC)</p>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min="1"
                    inputMode="decimal"
                    value={stakeAmount}
                    onChange={e => setStakeAmount(e.target.value)}
                    placeholder="100"
                    aria-label="Stake amount in USDC"
                    style={{
                      width: '100%', padding: '0.8rem 3.5rem 0.8rem 1rem',
                      borderRadius: '8px', border: '1px solid var(--border)',
                      background: 'var(--background)', color: 'var(--foreground)',
                      fontSize: '0.95rem', fontFamily: 'monospace', fontWeight: 700,
                      outline: 'none', boxSizing: 'border-box', minHeight: '44px',
                    }}
                  />
                  <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>USDC</span>
                </div>
                {/* Quick amounts */}
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  {[25, 50, 100, 250].map(amt => (
                    <button
                      key={amt}
                      onClick={() => setStakeAmount(String(amt))}
                      style={{
                        fontSize: '0.75rem', fontWeight: 700, padding: '0.55rem 0.75rem',
                        minHeight: '44px', minWidth: '52px',
                        borderRadius: '8px', cursor: 'pointer', transition: 'all 0.12s',
                        border: stakeAmount === String(amt) ? '1px solid rgba(34,211,238,0.4)' : '1px solid var(--border)',
                        background: stakeAmount === String(amt) ? 'rgba(34,211,238,0.1)' : 'var(--bg-surface)',
                        color: stakeAmount === String(amt) ? 'var(--cyan)' : 'var(--text-secondary)',
                      }}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payout preview */}
              <div style={{
                padding: '1rem', borderRadius: '10px',
                background: selectedSide === 'YES' ? 'rgba(52,211,153,0.06)' : 'rgba(248,113,113,0.06)',
                border: `1px solid ${selectedSide === 'YES' ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <p style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Potential Payout</p>
                    <p style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'monospace', color: selectedSide === 'YES' ? '#34d399' : '#f87171', lineHeight: 1 }}>
                      ${potentialPayout.toFixed(2)}
                    </p>
                    <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                      Stake ${Number(stakeAmount) || 0} · {Number(stakeAmount) > 0 ? ((potentialPayout / Number(stakeAmount)) * 100 - 100).toFixed(1) : '0'}% ROI · 5% fee
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Implied Odds</p>
                    <p style={{ fontSize: '0.95rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                      {(1 / ((selectedSide === 'YES' ? selectedMarket.yesPercent : (100 - selectedMarket.yesPercent)) / 100)).toFixed(2)}×
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div role="alert" style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', fontSize: '0.82rem' }}>
                  {error}
                </div>
              )}
            </div>

            {/* Panel footer CTA */}
            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
              <button
                onClick={handlePlaceHedge}
                disabled={busy}
                style={{
                  width: '100%', padding: '0.9rem', borderRadius: '10px', border: 'none',
                  fontWeight: 800, fontSize: '0.95rem', cursor: busy ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  background: busy ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg,var(--cyan,#06b6d4),#8b5cf6)',
                  color: busy ? 'var(--text-muted)' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                }}
              >
                {busy ? (
                  <>
                    <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'hmg-spin 0.75s linear infinite' }} aria-hidden="true" />
                    Placing Hedge...
                  </>
                ) : (
                  <>Place {selectedSide} Hedge · ${Number(stakeAmount) || 0} USDC</>
                )}
              </button>
              <p style={{ textAlign: 'center', fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '0.6rem' }}>
                AETHER Protocol · Devnet Demo
              </p>
            </div>
          </div>
        </>
      )}

      {/* Success toast — bottom-center on mobile, bottom-right on desktop */}
      {success && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: '1.25rem',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(360px, 90vw)',
            background: '#0d1117', border: '1px solid rgba(52,211,153,0.35)',
            borderRadius: '14px', padding: '1rem 1.25rem',
            zIndex: 9999,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(52,211,153,0.1)',
            animation: 'hmg-slideIn 0.3s ease-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <CheckCircle size={15} color="#34d399" aria-hidden="true" />
            <span style={{ color: '#34d399', fontWeight: 800, fontSize: '0.85rem' }}>Hedge Placed Successfully</span>
            <button
              onClick={() => setSuccess(null)}
              aria-label="Dismiss"
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '0.1rem' }}
            >
              <X size={13} />
            </button>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '0.6rem' }}>
            <strong style={{ color: success.side === 'YES' ? '#34d399' : '#f87171' }}>{success.side}</strong>
            {' '}· {success.amount} USDC · Payout up to{' '}
            <strong style={{ color: '#e2e8f0' }}>${success.payout.toFixed(2)}</strong>
          </p>
          <p style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.5rem', wordBreak: 'break-all', fontFamily: 'monospace' }}>
            Tx: {success.tx.slice(0, 16)}...{success.tx.slice(-8)}
          </p>
          <a
            href={`https://solscan.io/tx/${success.tx}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: 'var(--cyan,#06b6d4)', textDecoration: 'none', fontWeight: 600 }}
          >
            <ExternalLink size={10} aria-hidden="true" />
            View on Solscan
          </a>
        </div>
      )}

      <style>{`
        @keyframes hmg-spin { to { transform: rotate(360deg); } }
        @keyframes hmg-slideIn { from { transform: translateX(-50%) translateY(16px); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}
