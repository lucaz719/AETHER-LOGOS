'use client';

import { CheckCircle2, ChevronRight, FileText, Lock, Stamp, Loader2 } from 'lucide-react';

export type CommitStep = 'idle' | 'hashing' | 'invoicing' | 'locking' | 'registering' | 'complete';

export function CommitStepsDisplay({
  currentStep,
  completedSteps,
  poHash,
  invoiceNumber,
  escrowAmount,
  trackingId,
}: {
  currentStep: CommitStep;
  completedSteps: CommitStep[];
  poHash?: string;
  invoiceNumber?: string;
  escrowAmount?: number;
  trackingId?: string;
}) {
  const steps = [
    {
      id: 'hashing' as const,
      label: 'Hash Company PO',
      description: 'Cryptographically hashing your authorization document',
      icon: FileText,
      data: poHash,
      dataLabel: 'Document Hash',
    },
    {
      id: 'invoicing' as const,
      label: 'Generate Digital Invoice',
      description: 'Creating AETHER-formatted settlement record',
      icon: Stamp,
      data: invoiceNumber,
      dataLabel: 'Invoice Number',
    },
    {
      id: 'locking' as const,
      label: 'Lock USDC in Escrow',
      description: 'Transferring funds to escrow vault on Solana',
      icon: Lock,
      data: escrowAmount ? `$${escrowAmount.toFixed(2)} USDC` : undefined,
      dataLabel: 'Escrowed Amount',
    },
    {
      id: 'registering' as const,
      label: 'Register with Settlement Agent',
      description: 'Notifying carrier and agent of trade initiation',
      icon: Stamp,
      data: trackingId,
      dataLabel: 'Tracking ID',
    },
  ];

  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(step.id);
        const isActive = currentStep === step.id;
        const isFuture = !isCompleted && !isActive;

        const Icon = step.icon;

        return (
          <div
            key={step.id}
            className={`rounded-2xl border transition-all duration-300 ${
              isCompleted
                ? 'border-green-500/30 bg-green-500/5'
                : isActive
                  ? 'border-primary/50 bg-primary/10 shadow-lg shadow-primary/20'
                  : 'border-white/10 bg-white/5'
            }`}
          >
            <div className="p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-xl shrink-0 transition-all ${
                    isCompleted
                      ? 'bg-green-500/20 border border-green-500/30'
                      : isActive
                        ? 'bg-primary/20 border border-primary/30'
                        : 'bg-white/10 border border-white/20'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={20} className="text-green-500" />
                  ) : isActive ? (
                    <Loader2 size={20} className="text-primary animate-spin" />
                  ) : (
                    <Icon size={20} className="text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4
                      className={`text-sm font-bold uppercase tracking-tight transition-colors ${
                        isCompleted || isActive
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {index + 1}. {step.label}
                    </h4>
                    {isActive && (
                      <span className="px-2 py-1 rounded-full bg-primary/20 border border-primary/30 text-[10px] font-black text-primary uppercase tracking-widest">
                        In Progress
                      </span>
                    )}
                    {isCompleted && (
                      <span className="px-2 py-1 rounded-full bg-green-500/20 border border-green-500/30 text-[10px] font-black text-green-500 uppercase tracking-widest">
                        Complete
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-xs mt-1 transition-colors ${
                      isCompleted || isActive
                        ? 'text-muted-foreground'
                        : 'text-muted-foreground/60'
                    }`}
                  >
                    {step.description}
                  </p>
                </div>

                {!isActive && !isCompleted && index < steps.length - 1 && (
                  <ChevronRight size={18} className="text-white/10 shrink-0 mt-1" />
                )}
              </div>

              {/* Data Display */}
              {isCompleted && step.data && (
                <div
                  className="pl-11 pt-2 border-t border-current/10 animate-in fade-in slide-in-from-top-2"
                  style={{ animation: 'slideInData 300ms ease-out' }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {step.dataLabel}
                  </p>
                  <p className="text-xs font-mono text-foreground mt-1.5 break-all">
                    {step.data}
                  </p>
                </div>
              )}

              {/* Active State Data */}
              {isActive && (
                <div className="pl-11 pt-2 border-t border-primary/20">
                  <div className="flex items-center gap-2">
                    <Loader2 size={12} className="text-primary animate-spin" />
                    <p className="text-xs text-primary font-semibold">
                      Processing...
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      <style jsx>{`
        @keyframes slideInData {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
