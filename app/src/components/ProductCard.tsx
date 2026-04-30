'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/useToast';

const IPFS_GATEWAY =
  typeof window === 'undefined'
    ? 'https://gateway.pinata.cloud/ipfs'
    : process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? 'https://gateway.pinata.cloud/ipfs';

const CATEGORY_ICONS: Record<string, string> = {
  Electronics: '🔌', Apparel: '👕', HomeGoods: '🏠', Machinery: '⚙️',
  FoodBeverage: '🥤', Chemicals: '🧪', Automotive: '🚗', Healthcare: '💊',
  Construction: '🏗️', Other: '📦',
};

export function ProductCard({
  pubkey,
  title,
  priceUsdc,
  minOrderQty,
  maxOrderQty,
  vendorName,
  vendorAuthority,
  category,
  imagesCid,
  isActive,
  stockQuantity,
}: {
  pubkey: string;
  title: string;
  priceUsdc: number;
  minOrderQty: number;
  maxOrderQty?: number;
  vendorName?: string;
  vendorAuthority: string;
  category: string;
  imagesCid?: string;
  isActive: boolean;
  stockQuantity?: number;
}) {
  const { addItem, items } = useCart();
  const { success } = useToast();
  const [imgError, setImgError] = useState(false);
  const [adding, setAdding] = useState(false);

  const priceLabel = (priceUsdc / 1_000_000).toFixed(2);
  const inCart = items.some((i) => i.listingPubkey === pubkey);

  const imgUrl =
    imagesCid && !imgError ? `${IPFS_GATEWAY}/${imagesCid}` : null;

  // Stock indicator
  let stockBadge: { label: string; color: string } | null = null;
  if (stockQuantity !== undefined) {
    if (stockQuantity === 0) stockBadge = { label: 'Out of Stock', color: 'var(--red)' };
    else if (stockQuantity <= 5) stockBadge = { label: `Low Stock (${stockQuantity})`, color: 'var(--amber)' };
    else stockBadge = { label: 'In Stock', color: 'var(--green)' };
  }

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isActive || adding) return;
    setAdding(true);
    addItem({
      listingPubkey: pubkey,
      vendorPubkey: pubkey,
      vendorAuthority,
      title,
      priceUsdc,
      quantity: minOrderQty,
    });
    success(`"${title.slice(0, 30)}${title.length > 30 ? '…' : ''}" added to cart`);
    setTimeout(() => setAdding(false), 600);
  }

  return (
    <Link href={`/marketplace/listing/${pubkey}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div
        className="glass product-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          opacity: isActive ? 1 : 0.45,
          cursor: isActive ? 'pointer' : 'default',
          height: '100%',
          transition: 'box-shadow var(--transition), border-color var(--transition), transform var(--transition)',
        }}
      >
        {/* Image / Placeholder */}
        <div style={{ position: 'relative', width: '100%', height: 180, flexShrink: 0, overflow: 'hidden' }}>
          <div className="product-img-wrap" style={{ width: '100%', height: '100%', transition: 'transform 0.4s cubic-bezier(0.3, 0.8, 0.2, 1)' }}>
            {imgUrl ? (
              <Image
                src={imgUrl}
                alt={title}
                fill
                onError={() => setImgError(true)}
                style={{ objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, rgba(0,212,255,0.06), rgba(124,58,237,0.1))',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.25rem',
                }}
              >
                <span style={{ fontSize: '2.5rem' }}>{CATEGORY_ICONS[category] ?? '📦'}</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>No image</span>
              </div>
            )}
          </div>

          {/* Stock badge overlay */}
          {stockBadge && (
            <div
              style={{
                position: 'absolute',
                bottom: 6,
                left: 6,
                background: 'rgba(10,15,26,0.85)',
                border: `1px solid ${stockBadge.color}`,
                color: stockBadge.color,
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '0.15rem 0.5rem',
              }}
            >
              {stockBadge.label}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="badge badge-violet" style={{ alignSelf: 'flex-start', marginBottom: '0.2rem' }}>{category}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.65rem', color: 'var(--green)', fontWeight: 600, background: 'var(--green-dim)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
               🛡️ Escrow
            </div>
          </div>
          
          <div
            style={{
              fontWeight: 600,
              fontSize: '0.95rem',
              lineHeight: 1.3,
              color: 'var(--text-primary)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              flex: 1,
            }}
          >
            {title}
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', marginTop: '0.2rem' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--cyan)' }}>${priceLabel}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>USDC / unit</span>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            <span style={{ color: 'var(--text-primary)' }}>{minOrderQty}</span> units MOQ
            {maxOrderQty ? ` (Max: ${maxOrderQty})` : ''}
          </div>

          {vendorName && (
            <Link
              href={`/marketplace/vendor/${vendorAuthority}`}
              onClick={(e) => e.stopPropagation()}
              style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'none', marginTop: '0.2rem', marginBottom: '0.4rem' }}
            >
              Supplier: <span style={{ color: 'var(--text-secondary)' }}>{vendorName}</span>
            </Link>
          )}

          {/* Add to Cart */}
          {isActive && (
            <button
              type="button"
              onClick={handleAddToCart}
              aria-label={inCart ? 'Already in cart' : `Add ${title} to cart`}
              style={{
                marginTop: '0.4rem',
                padding: '0.4rem',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${inCart ? 'rgba(0,212,255,0.3)' : 'var(--border)'}`,
                background: inCart ? 'var(--cyan-dim)' : 'var(--bg-surface)',
                color: inCart ? 'var(--cyan)' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                width: '100%',
                transition: 'all var(--transition)',
              }}
            >
              {adding ? '✓ Added!' : inCart ? '✓ In Cart' : '+ Add to Cart'}
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
