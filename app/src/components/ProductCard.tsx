'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Package, ShieldCheck, ShoppingCart, Store } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/useToast';

const IPFS_GATEWAY =
  typeof window === 'undefined'
    ? 'https://gateway.pinata.cloud/ipfs'
    : process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? 'https://gateway.pinata.cloud/ipfs';

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
  isVerified = true,
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
  isVerified?: boolean;
}) {
  const { addItem, items } = useCart();
  const { success } = useToast();
  const [imgError, setImgError] = useState(false);
  const [adding, setAdding] = useState(false);

  const priceLabel = (priceUsdc / 1_000_000).toFixed(2);
  const inCart = items.some((i) => i.listingPubkey === pubkey);
  const imgUrl = imagesCid && !imgError ? `${IPFS_GATEWAY}/${imagesCid}` : null;

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
    success(`"${title.slice(0, 30)}${title.length > 30 ? '…' : ''}" added to requisition`);
    setTimeout(() => setAdding(false), 600);
  }

  return (
    <Link href={`/marketplace/listing/${pubkey}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <article
        className="glass group flex h-full flex-col overflow-hidden transition-all duration-300"
        style={{
          opacity: isActive ? 1 : 0.45,
          cursor: isActive ? 'pointer' : 'default',
        }}
      >
        <div className="relative h-[190px] w-full overflow-hidden">
          <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.04]">
            {imgUrl ? (
              <Image
                src={imgUrl}
                alt={title}
                fill
                onError={() => setImgError(true)}
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/5 via-transparent to-violet-500/10">
                <Package size={34} className="text-primary" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  No image
                </span>
              </div>
            )}
          </div>

          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <span className="badge badge-violet">{category}</span>
            {isVerified && (
              <span className="badge badge-green inline-flex items-center gap-1">
                <ShieldCheck size={11} />
                Verified
              </span>
            )}
          </div>

          {stockBadge && (
            <div
              className="absolute bottom-3 left-3 rounded-full border bg-background/90 px-2.5 py-1 text-[11px] font-semibold"
              style={{ borderColor: stockBadge.color, color: stockBadge.color }}
            >
              {stockBadge.label}
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3 p-5">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{category}</p>
            <h3 className="line-clamp-2 min-h-[42px] text-sm font-bold leading-tight text-foreground group-hover:text-primary transition-colors">
              {title}
            </h3>
          </div>

          {vendorName && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3 py-2">
              <Store size={13} className="shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Supplier
                </p>
                <p className="truncate text-xs font-semibold text-foreground">{vendorName}</p>
              </div>
            </div>
          )}

          <div className="mt-auto grid gap-3 border-t border-border pt-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Unit price
                </p>
                <p className="text-xl font-black tracking-tight text-foreground">${priceLabel}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  MOQ
                </p>
                <p className="text-sm font-bold text-foreground">{minOrderQty} units</p>
              </div>
            </div>

            {isActive && (
              <button
                type="button"
                onClick={handleAddToCart}
                aria-label={inCart ? 'Already in requisition' : `Add ${title} to requisition`}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition-all ${
                  inCart
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-border bg-background text-foreground hover:border-primary/30 hover:bg-primary/5'
                }`}
              >
                <ShoppingCart size={14} />
                {adding ? 'Added to requisition' : inCart ? 'In requisition' : 'Add to requisition'}
              </button>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
