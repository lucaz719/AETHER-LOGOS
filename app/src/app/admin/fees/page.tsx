'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSolPrice, formatUsd, usdToLamports } from '@/hooks/useSolPrice';

export default function AdminFeesPage() {
  const { solPriceUsd } = useSolPrice();
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'usdc' | 'sol'>('usdc');
  const [withdrawalRecipient, setWithdrawalRecipient] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [withdrawalStatus, setWithdrawalStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  // Mock data - in production, fetch from blockchain
  const totalFeesCollected = {
    usdc: 15_250_00, // $15,250 USDC
    lamports: 107_500_000_000, // ~0.1075 SOL
  };

  const recentWithdrawals = [
    { id: 1, amount: 5000, currency: 'USDC', timestamp: '2026-05-03 18:30', status: 'confirmed' },
    { id: 2, amount: 0.05, currency: 'SOL', timestamp: '2026-05-02 14:15', status: 'confirmed' },
    { id: 3, amount: 3000, currency: 'USDC', timestamp: '2026-04-30 09:45', status: 'confirmed' },
  ];

  const handleWithdraw = async () => {
    if (!withdrawalAmount || !withdrawalRecipient) {
      setStatusMessage('Please enter both amount and recipient address');
      setWithdrawalStatus('error');
      return;
    }

    setIsProcessing(true);
    setWithdrawalStatus('idle');

    try {
      // TODO: Call blockchain withdraw_platform_fees instruction
      // For now, just simulate success
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setStatusMessage(
        `Successfully initiated withdrawal of ${withdrawalAmount} ${paymentMethod.toUpperCase()}`
      );
      setWithdrawalStatus('success');
      setWithdrawalAmount('');
      setWithdrawalRecipient('');
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Failed to process withdrawal'
      );
      setWithdrawalStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const totalUsdValue =
    (totalFeesCollected.usdc / 1_000_000) +
    (totalFeesCollected.lamports / 1_000_000_000) * solPriceUsd;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Back Link */}
      <Link
        href="/dashboard"
        style={{
          color: 'var(--text-secondary)',
          textDecoration: 'none',
          fontSize: '0.9rem',
          marginBottom: '1.5rem',
          display: 'inline-block',
        }}
      >
        ← Back to Dashboard
      </Link>

      <h1 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Platform Fee Management</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Track and withdraw accumulated platform fees from all transactions
      </p>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {/* Total Value */}
        <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
            Total Fees (USD Value)
          </div>
          <div style={{ color: 'var(--cyan)', fontSize: '1.8rem', fontWeight: 700 }}>
            {formatUsd(totalUsdValue)}
          </div>
        </div>

        {/* USDC Balance */}
        <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
            USDC Collected
          </div>
          <div style={{ color: 'var(--green)', fontSize: '1.8rem', fontWeight: 700 }}>
            ${(totalFeesCollected.usdc / 1_000_000).toFixed(2)}
          </div>
        </div>

        {/* SOL Balance */}
        <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
            SOL Collected
          </div>
          <div style={{ color: 'var(--violet)', fontSize: '1.8rem', fontWeight: 700 }}>
            {(totalFeesCollected.lamports / 1_000_000_000).toFixed(6)} SOL
          </div>
        </div>
      </div>

      {/* Withdrawal Form */}
      <div className="glass" style={{ padding: '2rem', marginBottom: '2rem', borderRadius: 'var(--radius-lg)' }}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', fontSize: '1.2rem' }}>
          Withdraw Fees
        </h2>

        {/* Payment Method Toggle */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'block', marginBottom: '0.75rem' }}>
            Payment Method
          </label>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => setPaymentMethod('usdc')}
              style={{
                flex: 1,
                padding: '0.65rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                background: paymentMethod === 'usdc' ? 'var(--cyan)' : 'transparent',
                color: paymentMethod === 'usdc' ? 'var(--bg-base)' : 'var(--text-secondary)',
                fontWeight: paymentMethod === 'usdc' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              💵 USDC
            </button>
            <button
              onClick={() => setPaymentMethod('sol')}
              style={{
                flex: 1,
                padding: '0.65rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                background: paymentMethod === 'sol' ? 'var(--violet)' : 'transparent',
                color: paymentMethod === 'sol' ? 'white' : 'var(--text-secondary)',
                fontWeight: paymentMethod === 'sol' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              ◎ SOL
            </button>
          </div>
        </div>

        {/* Amount Input */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'block', marginBottom: '0.75rem' }}>
            Amount ({paymentMethod.toUpperCase()})
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="number"
              value={withdrawalAmount}
              onChange={(e) => setWithdrawalAmount(e.target.value)}
              placeholder={paymentMethod === 'usdc' ? '1000.00' : '0.5'}
              className="input"
              style={{ flex: 1, padding: '0.75rem' }}
            />
            <button
              onClick={() => {
                if (paymentMethod === 'usdc') {
                  setWithdrawalAmount((totalFeesCollected.usdc / 1_000_000).toString());
                } else {
                  setWithdrawalAmount((totalFeesCollected.lamports / 1_000_000_000).toString());
                }
              }}
              style={{
                padding: '0.75rem 1rem',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Max
            </button>
          </div>
        </div>

        {/* Recipient Address */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'block', marginBottom: '0.75rem' }}>
            Recipient {paymentMethod === 'usdc' ? 'Token Account' : 'System Address'}
          </label>
          <input
            type="text"
            value={withdrawalRecipient}
            onChange={(e) => setWithdrawalRecipient(e.target.value)}
            placeholder={paymentMethod === 'usdc' ? 'TokenAddress...' : 'SolanaAddress...'}
            className="input"
            style={{ width: '100%', padding: '0.75rem' }}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {paymentMethod === 'usdc'
              ? 'Your USDC token account address'
              : 'Your Solana wallet address to receive SOL'}
          </p>
        </div>

        {/* Status Message */}
        {withdrawalStatus !== 'idle' && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1rem',
              background:
                withdrawalStatus === 'success'
                  ? 'rgba(34, 197, 94, 0.08)'
                  : 'rgba(244, 63, 94, 0.08)',
              border:
                withdrawalStatus === 'success'
                  ? '1px solid rgba(34, 197, 94, 0.25)'
                  : '1px solid rgba(244, 63, 94, 0.25)',
              color: withdrawalStatus === 'success' ? 'var(--green)' : 'var(--red)',
              fontSize: '0.85rem',
            }}
          >
            {statusMessage}
          </div>
        )}

        {/* Withdraw Button */}
        <button
          onClick={handleWithdraw}
          disabled={isProcessing || !withdrawalAmount || !withdrawalRecipient}
          className="btn-primary"
          style={{
            width: '100%',
            padding: '0.85rem',
            fontSize: '1rem',
            opacity: isProcessing || !withdrawalAmount || !withdrawalRecipient ? 0.6 : 1,
            cursor:
              isProcessing || !withdrawalAmount || !withdrawalRecipient ? 'not-allowed' : 'pointer',
          }}
        >
          {isProcessing
            ? '⏳ Processing Withdrawal…'
            : `Withdraw ${paymentMethod.toUpperCase()}`}
        </button>
      </div>

      {/* Recent Withdrawals */}
      <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', fontSize: '1.2rem' }}>
          Recent Withdrawals
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                }}
              >
                <th style={{ textAlign: 'left', padding: '0.75rem', fontWeight: 600 }}>Amount</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontWeight: 600 }}>Currency</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontWeight: 600 }}>Date</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentWithdrawals.map((withdrawal) => (
                <tr key={withdrawal.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                    {withdrawal.currency === 'USDC'
                      ? `$${withdrawal.amount.toFixed(2)}`
                      : `${withdrawal.amount.toFixed(6)} SOL`}
                  </td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                    {withdrawal.currency}
                  </td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                    {withdrawal.timestamp}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '0.3rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(34, 197, 94, 0.1)',
                        color: 'var(--green)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}
                    >
                      ✓ {withdrawal.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
