'use client';

import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/hooks/useCart';
import Link from 'next/link';

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, removeItem, updateQty, totalUsdc } = useCart();
  const [mounted, setMounted] = useState(false);
  const [animOut, setAnimOut] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Mount on first open
  useEffect(() => {
    if (open) { setMounted(true); setAnimOut(false); }
  }, [open]);

  // Animate out before unmounting
  function handleClose() {
    setAnimOut(true);
    setTimeout(() => {
      setMounted(false);
      setAnimOut(false);
      onClose();
    }, 220);
  }

  // Keyboard ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!mounted) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        ref={overlayRef}
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 40,
          opacity: animOut ? 0 : 1,
          transition: 'opacity 0.22s ease',
        }}
      />

      {/* Drawer panel */}
      <div
        className={`cart-drawer-panel ${animOut ? 'cart-drawer-exit' : 'cart-drawer-enter'}`}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 380,
          maxWidth: '100vw',
          background: '#111827',
          borderLeft: '1px solid var(--border)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.65)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
            🛒 Cart
            <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.82rem', marginLeft: '0.4rem' }}>
              ({items.length} {items.length === 1 ? 'item' : 'items'})
            </span>
          </span>
          <button
            onClick={handleClose}
            aria-label="Close cart"
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              borderRadius: 'var(--radius-sm)',
              width: 30,
              height: 30,
              cursor: 'pointer',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'border-color var(--transition)',
            }}
          >
            ✕
          </button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1.25rem', display: 'grid', gap: '0.6rem', alignContent: 'flex-start' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem', filter: 'grayscale(1)' }}>🛒</div>
              <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Your cart is empty</p>
              <p style={{ fontSize: '0.82rem' }}>Browse the marketplace to add items.</p>
              <Link
                href="/marketplace"
                onClick={handleClose}
                style={{ display: 'inline-block', marginTop: '1rem', color: 'var(--cyan)', fontSize: '0.85rem', fontWeight: 600 }}
              >
                Browse Marketplace →
              </Link>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.listingPubkey}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem',
                  display: 'grid',
                  gap: '0.35rem',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.35 }}>{item.title}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--cyan)', fontWeight: 600 }}>
                  ${(item.priceUsdc / 1_000_000).toFixed(2)} USDC
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> × {item.quantity} = ${((item.priceUsdc * item.quantity) / 1_000_000).toFixed(2)}</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>🔒 Funds locked in escrow on checkout</div>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.2rem' }}>
                  <button
                    aria-label="Decrease quantity"
                    onClick={() => updateQty(item.listingPubkey, item.quantity - 1)}
                    style={{
                      background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)',
                      borderRadius: 'var(--radius-sm)', width: 26, height: 26, cursor: 'pointer', fontSize: '1rem', lineHeight: 1,
                    }}
                  >−</button>
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)', minWidth: 22, textAlign: 'center', fontWeight: 600 }}>
                    {item.quantity}
                  </span>
                  <button
                    aria-label="Increase quantity"
                    onClick={() => updateQty(item.listingPubkey, item.quantity + 1)}
                    style={{
                      background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)',
                      borderRadius: 'var(--radius-sm)', width: 26, height: 26, cursor: 'pointer', fontSize: '1rem', lineHeight: 1,
                    }}
                  >+</button>
                  <button
                    aria-label={`Remove ${item.title} from cart`}
                    onClick={() => removeItem(item.listingPubkey)}
                    style={{
                      marginLeft: 'auto', background: 'transparent', border: 'none',
                      color: 'var(--red)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                    }}
                  >Remove</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderTop: '1px solid var(--border)',
            display: 'grid',
            gap: '0.75rem',
            background: 'rgba(0,0,0,0.15)',
          }}
        >
          {/* Subtotal */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--text-primary)' }}>
            <span>Subtotal</span>
            <span style={{ color: 'var(--cyan)' }}>${(totalUsdc / 1_000_000).toFixed(2)} USDC</span>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Funds are locked in on-chain escrow — only released on delivery confirmation.
          </p>
          <Link
            href="/marketplace/checkout"
            onClick={handleClose}
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '0.7rem',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              pointerEvents: items.length === 0 ? 'none' : 'auto',
              opacity: items.length === 0 ? 0.4 : 1,
              background: items.length === 0 ? 'var(--bg-surface)' : 'var(--cyan)',
              color: items.length === 0 ? 'var(--text-muted)' : 'var(--text-inverse)',
              fontWeight: 700,
              fontSize: '0.9rem',
              transition: 'filter var(--transition)',
            }}
          >
            Checkout →
          </Link>
        </div>
      </div>
    </>
  );
}
