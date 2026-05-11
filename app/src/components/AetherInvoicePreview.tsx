'use client';

import { useState } from 'react';
import { X, Copy, FileText, DollarSign, ArrowRight } from 'lucide-react';

type SettlementLineItem = {
  productId: string;
  title: string;
  tier: string;
  moq: number;
  leadTimeDays: number;
  priceUsdc: number;
  quantity: number;
  sellerWallet: string;
  usdcMint: string;
};

type VendorProfile = {
  shopName: string;
  isVerified: boolean;
};

export function AetherInvoicePreview({
  items,
  buyerAddress,
  vendorProfiles,
  grandTotal,
  subtotal,
  platformFee,
  isOpen,
  onClose,
  invoiceCid,
  status = 'PAID',
}: {
  items: SettlementLineItem[];
  buyerAddress: string;
  vendorProfiles: Record<string, VendorProfile>;
  grandTotal: number;
  subtotal: number;
  platformFee: number;
  isOpen: boolean;
  onClose: () => void;
  invoiceCid?: string;
  status?: string;
}){
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const primaryItem = items[0];
  const primaryVendor = primaryItem?.sellerWallet ? vendorProfiles[primaryItem.sellerWallet] : undefined;
  const invoiceNumber = `AETHER-${Date.now().toString().slice(-8)}`;
  const invoiceDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const handleCopy = () => {
    if (invoiceCid) {
      navigator.clipboard.writeText(invoiceCid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 backdrop-blur-xl bg-black/40"
        onClick={onClose}
        style={{ animation: 'fadeIn 300ms ease-out' }}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
        style={{ animation: 'fadeIn 300ms ease-out' }}
      >
        <div
          className="glass rounded-3xl border border-white/10 shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto backdrop-blur-2xl"
          onClick={(e) => e.stopPropagation()}
          style={{ animation: 'slideUp 300ms ease-out', position: 'relative' }}
        >
          {/* PAID status badge */}
          {status === 'PAID' && (
            <div style={{
              position: 'absolute', top: '1.25rem', right: '3.5rem', zIndex: 10,
              background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.5)',
              borderRadius: '8px', padding: '0.25rem 0.75rem',
              color: '#22c55e', fontSize: '0.72rem', fontWeight: 900,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              boxShadow: '0 0 12px rgba(34,197,94,0.2)',
            }}>
              PAID ✓
            </div>
          )}
          {/* Header */}
          <div className="sticky top-0 flex items-center justify-between px-8 py-6 border-b border-white/5 bg-gradient-to-br from-white/10 to-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                <FileText size={20} className="text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-black text-foreground">AETHER Digital Invoice</h2>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mt-0.5">
                  Auto-Generated B2B Settlement Record
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors"
            >
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>

          {/* Invoice Content */}
          <div className="p-8 space-y-6">
            {/* Invoice Meta */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Invoice Number
                </p>
                <p className="text-sm font-mono font-semibold text-foreground mt-1">{invoiceNumber}</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Date</p>
                <p className="text-sm font-semibold text-foreground mt-1">{invoiceDate}</p>
              </div>
            </div>

            {/* Parties Section */}
            <div className="grid grid-cols-2 gap-6">
              {/* Buyer */}
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Bill To (Buyer)
                </p>
                <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                  <p className="text-xs font-mono text-foreground break-all">{buyerAddress}</p>
                </div>
              </div>

              {/* Seller */}
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Ship From (Seller)
                </p>
                <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                  <p className="text-sm font-semibold text-foreground">
                    {primaryVendor?.shopName ?? 'Supplier'}
                  </p>
                  <p className="text-xs font-mono text-muted-foreground mt-1 break-all">
                    {primaryItem?.sellerWallet || 'pending'}
                  </p>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Line Items
              </p>
              <div className="rounded-2xl border border-white/5 overflow-hidden">
                {/* Header Row */}
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-4 py-3 bg-white/5 border-b border-white/5">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    Description
                  </p>
                  <p className="text-right text-xs font-black uppercase tracking-widest text-muted-foreground">
                    Qty
                  </p>
                  <p className="text-right text-xs font-black uppercase tracking-widest text-muted-foreground">
                    Unit Price
                  </p>
                  <p className="text-right text-xs font-black uppercase tracking-widest text-muted-foreground">
                    Total
                  </p>
                </div>

                {/* Data Rows */}
                {items.map((item, idx) => {
                  const lineTotal = item.priceUsdc * item.quantity;
                  return (
                    <div
                      key={`${item.productId}-${idx}`}
                      className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-4 py-4 border-b border-white/5 hover:bg-white/3 transition-colors last:border-b-0"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.tier} • Lead: {item.leadTimeDays}d • MOQ: {item.moq}
                        </p>
                      </div>
                      <p className="text-right text-sm font-semibold text-foreground">{item.quantity}</p>
                      <p className="text-right text-sm font-semibold text-foreground">
                        ${item.priceUsdc.toFixed(2)}
                      </p>
                      <p className="text-right text-sm font-bold text-primary">${lineTotal.toFixed(2)}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Cost Summary
              </p>
              <div className="rounded-2xl border border-white/5 bg-white/5 p-6 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal (before platform fee)</span>
                  <span className="font-semibold text-foreground">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Platform Fee (2%)</span>
                  <span className="font-semibold text-foreground">${platformFee.toFixed(2)}</span>
                </div>
                <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                  <span className="text-base font-black text-foreground">GRAND TOTAL (Escrowed)</span>
                  <span className="text-2xl font-black text-primary">${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* CID Section */}
            {invoiceCid && (
              <div className="space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  IPFS Content Hash
                </p>
                <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-green-600 uppercase tracking-widest font-bold">
                      Pinned to escrow
                    </p>
                    <p className="text-xs font-mono text-foreground break-all mt-1">{invoiceCid}</p>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="shrink-0 p-2 rounded-lg hover:bg-white/10 transition-colors"
                    title="Copy CID"
                  >
                    <Copy
                      size={16}
                      className={copied ? 'text-green-500' : 'text-muted-foreground'}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* AETHER Branding Footer */}
            <div className="pt-4 border-t border-white/5 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-md bg-primary" />
                </div>
                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                  AETHER-LOGOS Trade Settlement Protocol
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                This invoice is automatically generated and cryptographically secured on Solana Devnet.
              </p>
            </div>
          </div>

          {/* Close Button */}
          <div className="sticky bottom-0 px-8 py-4 border-t border-white/5 bg-gradient-to-t from-white/5 to-transparent flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-sm font-semibold text-foreground"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
