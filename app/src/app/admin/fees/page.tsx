'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useAnchorClient } from '@/hooks/useAnchorClient';
import { ESCROW_PROGRAM_ID } from '@/lib/anchor';
import { formatUsd } from '@/hooks/useSolPrice';
import { toAtoms, toUsd } from '@/lib/units';

export default function AdminFeesPage() {
  const { connection, escrowProgram, wallet } = useAnchorClient();
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'usdc' | 'sol'>('usdc');
  const [withdrawalRecipient, setWithdrawalRecipient] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [withdrawalStatus, setWithdrawalStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const [usdcAtoms, setUsdcAtoms] = useState<number | null>(null);
  const [solLamports, setSolLamports] = useState<number | null>(null);
  const [recentWithdrawals, setRecentWithdrawals] = useState<any[]>([]);
  const DEVNET_USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

  // Load on-chain balances for fee vault and config account (SOL)
  useEffect(() => {
    if (!connection) return;
    (async () => {
      try {
        const [feeVaultPda] = PublicKey.findProgramAddressSync([Buffer.from('fee-vault')], ESCROW_PROGRAM_ID);
        const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config')], ESCROW_PROGRAM_ID);
        const tv = await connection.getTokenAccountBalance(feeVaultPda).catch(() => null);
        setUsdcAtoms(tv?.value?.amount ? Number(tv.value.amount) : 0);
        const solBal = await connection.getBalance(configPda).catch(() => 0);
        setSolLamports(solBal ?? 0);
      } catch (e) {
        console.error('failed loading balances', e);
      }
    })();
  }, [connection]);

  const handleWithdraw = async () => {
    if (!withdrawalAmount || !withdrawalRecipient) {
      setStatusMessage('Please enter both amount and recipient address');
      setWithdrawalStatus('error');
      return;
    }
    if (!escrowProgram || !connection || !wallet?.publicKey) {
      setStatusMessage('Blockchain client unavailable');
      setWithdrawalStatus('error');
      return;
    }

    setIsProcessing(true);
    setWithdrawalStatus('idle');

    try {
      if (paymentMethod === 'usdc') {
        const amountAtoms = toAtoms(Number(withdrawalAmount));
        const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config')], ESCROW_PROGRAM_ID);
        const [feeVaultPda] = PublicKey.findProgramAddressSync([Buffer.from('fee-vault')], ESCROW_PROGRAM_ID);
        const [vaultAuth] = PublicKey.findProgramAddressSync([Buffer.from('authority')], ESCROW_PROGRAM_ID);
        const recipientTokenAccount = new PublicKey(withdrawalRecipient);

        // Call Anchor instruction to withdraw platform fees (USDC)
        const tx = await (escrowProgram.methods as any)
          .withdrawPlatformFees(new BN(amountAtoms))
          .accounts({
            admin: wallet.publicKey,
            config: configPda,
            feeVault: feeVaultPda,
            vaultAuthority: vaultAuth,
            recipientTokenAccount: recipientTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();

        setStatusMessage(`Successfully withdrew ${withdrawalAmount} USDC — tx: ${tx}`);
        setWithdrawalStatus('success');
        setWithdrawalAmount('');
        setWithdrawalRecipient('');
        const bal = await connection.getTokenAccountBalance(feeVaultPda).catch(() => null);
        setUsdcAtoms(bal?.value?.amount ? Number(bal.value.amount) : 0);
      } else {
        setStatusMessage('SOL withdrawal must be performed via on-chain governance or CLI — not supported in UI.');
        setWithdrawalStatus('error');
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to process withdrawal');
      setWithdrawalStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const totalUsdValue = toUsd(usdcAtoms ?? 0);

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
            ${((usdcAtoms ?? 0) / 1_000_000).toFixed(2)}
          </div>
        </div>

        {/* SOL Balance */}
        <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
            SOL Collected
          </div>
          <div style={{ color: 'var(--violet)', fontSize: '1.8rem', fontWeight: 700 }}>
            ${((solLamports ?? 0) / 1_000_000_000).toFixed(6)} SOL
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
              USDC
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
                  setWithdrawalAmount(((usdcAtoms ?? 0) / 1_000_000).toString());
                } else {
                  setWithdrawalAmount(((solLamports ?? 0) / 1_000_000_000).toString());
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
            ? 'Processing Withdrawal…'
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
