'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShoppingCart, X, Trash2, ArrowRight, Package } from 'lucide-react';
import { useCart } from '@/hooks/useCart';

const DEVNET_USDC_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';

export default function CartSheet() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { items, removeItem, clearCart, totalUsdc } = useCart();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCheckout = () => {
    if (items.length === 0) return;
    const params = new URLSearchParams();
    const primary = items[0];
    params.set('productId', String(primary.listingPubkey));
    params.set('title', primary.title);
    params.set('sellerWallet', primary.vendorAuthority);
    params.set('usdcMint', primary.usdcMint ?? DEVNET_USDC_MINT);
    params.set('tier', primary.tier ?? 'wholesaler');
    params.set('moq', String(primary.moq ?? primary.quantity ?? 1));
    params.set('leadTimeDays', String(primary.leadTimeDays ?? 7));
    params.set('priceUsdc', String(primary.priceUsdc / 1_000_000));
    params.set('quantity', String(primary.quantity));

    items.forEach((item, idx) => {
      params.set(`item_${idx}_productId`, String(item.listingPubkey));
      params.set(`item_${idx}_title`, item.title);
      params.set(`item_${idx}_priceUsdc`, String(item.priceUsdc / 1_000_000));
      params.set(`item_${idx}_quantity`, String(item.quantity));
      params.set(`item_${idx}_sellerWallet`, item.vendorAuthority);
      if (item.usdcMint) params.set(`item_${idx}_usdcMint`, String(item.usdcMint));
    });

    window.location.href = `/trades?${params.toString()}`;
  };

  const drawerContent = (
    <div className={`fixed inset-0 z-[9999] pointer-events-none ${open ? 'pointer-events-auto' : ''}`}>
      <div 
        className={`absolute inset-0 bg-black/40 backdrop-blur-[4px] transition-opacity duration-500 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={() => setOpen(false)}
      />

      <aside
        className={`absolute right-0 top-0 h-full w-[400px] max-w-full flex flex-col border-l border-white/10 bg-card/90 backdrop-blur-3xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header - Premium Glass */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-3">
             <ShoppingCart size={20} className="text-primary" />
             <div>
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">Requisition</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">
                  {items.length} Assets Secured
                </p>
             </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="group p-2 hover:bg-white/5 rounded-xl transition-all"
          >
            <X size={18} className="text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        </div>

        {/* Content - High Density */}
        <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-white/5 text-muted-foreground/20">
                <Package size={32} strokeWidth={1} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/40">Queue Empty</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={`${item.listingPubkey}-${item.vendorAuthority}`}
                  className="group relative rounded-2xl border border-white/5 bg-white/5 p-4 transition-all hover:border-primary/30 hover:bg-white/[0.08]"
                >
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <p className="text-[11px] font-black leading-tight text-foreground uppercase tracking-tight line-clamp-2">
                      {item.title}
                    </p>
                    <button
                      onClick={() => removeItem(item.listingPubkey)}
                      className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-end border-t border-white/5 pt-3">
                    <div className="flex items-center gap-2">
                       <span className="text-xs font-black text-foreground">{item.quantity}</span>
                       <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Units</span>
                    </div>
                    <div className="text-right">
                       <p className="text-sm font-black text-primary tracking-tighter">
                         ${((item.priceUsdc * item.quantity) / 1_000_000).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                       </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - Premium Data */}
        <div className="p-8 border-t border-white/10 bg-white/5 backdrop-blur-xl shrink-0">
          <div className="mb-6 flex items-end justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Total Liquidity</p>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <p className="text-[9px] font-black text-primary uppercase tracking-widest">zkTLS Verified</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black tracking-tighter text-foreground">
                ${(totalUsdc / 1_000_000).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="ml-2 text-[10px] font-black text-primary">USDC</span>
            </div>
          </div>

          <div className="grid gap-3">
            <button
              onClick={handleCheckout}
              disabled={items.length === 0}
              className="group relative flex w-full items-center justify-center gap-3 rounded-2xl bg-foreground py-4 text-[10px] font-black text-background transition-all hover:bg-primary hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-[0.98] disabled:opacity-10"
            >
              INITIALIZE SETTLEMENT
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => { clearCart(); setOpen(false); }}
              disabled={items.length === 0}
              className="w-full text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 hover:text-destructive transition-colors"
            >
              Clear All Requisitions
            </button>
          </div>
        </div>
      </aside>
    </div>
  );

  return (
    <>
      {/* Trigger - Icon Restored */}
      <button
        onClick={() => setOpen(true)}
        className="group relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 backdrop-blur-md transition-all hover:bg-white/10 active:scale-95"
      >
        <ShoppingCart size={15} className="text-foreground group-hover:text-primary transition-colors" />
        {items.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-black text-white ring-2 ring-background shadow-lg shadow-primary/20">
            {items.length}
          </span>
        )}
      </button>

      {mounted && createPortal(drawerContent, document.body)}
    </>
  );
}
