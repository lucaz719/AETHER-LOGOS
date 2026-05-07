'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';

interface SettlementStatus {
  trackingId: string;
  status: 'pending' | 'verifying' | 'generating-proof' | 'submitting' | 'completed' | 'failed';
  message: string;
  timestamp: number;
  txSignature?: string;
}

export function SettlementStatusBadge() {
  const [settlement, setSettlement] = useState<SettlementStatus | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check localStorage for settlement status
    const checkStatus = () => {
      const storedStatus = localStorage.getItem('settlement_status');
      if (storedStatus) {
        const status: SettlementStatus = JSON.parse(storedStatus);
        // Auto-hide after 10 seconds if completed
        if (status.status === 'completed' && Date.now() - status.timestamp > 10000) {
          localStorage.removeItem('settlement_status');
          setIsVisible(false);
        } else {
          setSettlement(status);
          setIsVisible(true);
        }
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible || !settlement) return null;

  const statusConfig: Record<SettlementStatus['status'], {
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    borderColor: string;
  }> = {
    pending: {
      icon: <Clock size={14} />,
      color: '#6B7280',
      bgColor: 'rgba(107, 114, 128, 0.15)',
      borderColor: 'rgba(107, 114, 128, 0.3)',
    },
    verifying: {
      icon: <Loader2 size={14} className="animate-spin" />,
      color: '#FBBF24',
      bgColor: 'rgba(251, 191, 36, 0.15)',
      borderColor: 'rgba(251, 191, 36, 0.3)',
    },
    'generating-proof': {
      icon: <Loader2 size={14} className="animate-spin" />,
      color: '#60A5FA',
      bgColor: 'rgba(96, 165, 250, 0.15)',
      borderColor: 'rgba(96, 165, 250, 0.3)',
    },
    submitting: {
      icon: <Loader2 size={14} className="animate-spin" />,
      color: '#A78BFA',
      bgColor: 'rgba(167, 139, 250, 0.15)',
      borderColor: 'rgba(167, 139, 250, 0.3)',
    },
    completed: {
      icon: <CheckCircle2 size={14} />,
      color: '#22C55E',
      bgColor: 'rgba(34, 197, 94, 0.15)',
      borderColor: 'rgba(34, 197, 94, 0.3)',
    },
    failed: {
      icon: <AlertCircle size={14} />,
      color: '#EF4444',
      bgColor: 'rgba(239, 68, 68, 0.15)',
      borderColor: 'rgba(239, 68, 68, 0.3)',
    },
  };

  const config = statusConfig[settlement.status];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 0.75rem',
        background: config.bgColor,
        border: `1px solid ${config.borderColor}`,
        borderRadius: '0.5rem',
        color: config.color,
        fontSize: '0.8125rem',
        fontWeight: 500,
      }}
    >
      {config.icon}
      <span>{settlement.message}</span>
    </div>
  );
}

// Component for detailed settlement flow display
export function SettlementFlowViewer() {
  const [settlement, setSettlement] = useState<SettlementStatus | null>(null);

  useEffect(() => {
    const checkStatus = () => {
      const storedStatus = localStorage.getItem('settlement_status');
      if (storedStatus) {
        setSettlement(JSON.parse(storedStatus));
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 500);

    return () => clearInterval(interval);
  }, []);

  if (!settlement) return null;

  const steps = [
    { id: 'pending', label: 'Order Placed', description: 'Awaiting verification' },
    { id: 'verifying', label: 'Verifying Shipment', description: 'Checking DHL delivery status' },
    { id: 'generating-proof', label: 'Generating Proof', description: 'Creating zkTLS cryptographic proof' },
    { id: 'submitting', label: 'Submitting On-Chain', description: 'Recording proof on Solana' },
    { id: 'completed', label: 'Settlement Complete', description: 'Funds released to seller' },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === settlement.status);

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '0.75rem',
        padding: '1rem',
        marginTop: '1rem',
      }}
    >
      <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'white', marginBottom: '1rem' }}>
        Settlement Flow
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {steps.map((step, idx) => {
          const isActive = idx === currentStepIndex;
          const isCompleted = idx < currentStepIndex;

          return (
            <div key={step.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '1.5rem',
                  height: '1.5rem',
                  borderRadius: '50%',
                  background: isActive
                    ? 'rgba(96, 165, 250, 0.2)'
                    : isCompleted
                      ? 'rgba(34, 197, 94, 0.2)'
                      : 'rgba(107, 114, 128, 0.2)',
                  border: `2px solid ${
                    isActive ? '#60A5FA' : isCompleted ? '#22C55E' : '#6B7280'
                  }`,
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  color: isActive ? '#60A5FA' : isCompleted ? '#22C55E' : '#6B7280',
                  flexShrink: 0,
                }}
              >
                {isCompleted ? '✓' : idx + 1}
              </div>

              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: isActive ? 'white' : '#D1D5DB',
                  }}
                >
                  {step.label}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: isActive ? '#60A5FA' : '#9CA3AF',
                    marginTop: '0.25rem',
                  }}
                >
                  {isActive ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Loader2 size={12} className="animate-spin" />
                      {step.description}
                    </span>
                  ) : (
                    step.description
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {settlement.txSignature && settlement.status === 'completed' && (
        <div
          style={{
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            fontSize: '0.75rem',
            color: '#9CA3AF',
            fontFamily: 'monospace',
          }}
        >
          <div style={{ marginBottom: '0.25rem', color: '#6B7280' }}>Transaction Signature:</div>
          <div style={{ color: '#60A5FA', wordBreak: 'break-all' }}>
            {settlement.txSignature}
          </div>
        </div>
      )}
    </div>
  );
}
