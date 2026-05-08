'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useMemo } from 'react';

const VENDOR_TYPE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  Retailer:     { bg: 'rgba(0,212,255,0.1)',   color: '#00d4ff', border: 'rgba(0,212,255,0.25)' },
  Wholesaler:   { bg: 'rgba(124,58,237,0.12)', color: '#a78bfa', border: 'rgba(124,58,237,0.3)' },
  Distributor:  { bg: 'rgba(8,145,178,0.12)',  color: '#22d3ee', border: 'rgba(8,145,178,0.3)'  },
  Manufacturer: { bg: 'rgba(180,83,9,0.12)',   color: '#fb923c', border: 'rgba(180,83,9,0.3)'   },
};

/** Render 1–5 filled/empty stars */
function StarRow({ avg, count }: { avg: number; count: number }) {
  const filled = Math.round(avg);
  const label = count > 0 ? avg.toFixed(1) : '—';
  return (
    <span style={{ color: 'var(--amber)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} style={{ opacity: s <= filled ? 1 : 0.25 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--amber)' }} xmlns="http://www.w3.org/2000/svg"><path d="M12 .587l3.668 7.431L24 9.753l-6 5.848L19.335 24 12 19.897 4.665 24 6 15.601 0 9.753l8.332-1.735z"/></svg>
        </span>
      ))}
      <small style={{ color: 'var(--text-muted)', marginLeft: '0.2rem', fontSize: '0.72rem' }}>
        {label} ({count})
      </small>
    </span>
  );
}

/** Initials avatar when no logo is available */
function InitialsAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  const hue = name.charCodeAt(0) % 360;
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: 'var(--radius-sm)',
        background: `hsl(${hue},50%,18%)`,
        border: `1px solid hsl(${hue},50%,30%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: size * 0.35,
        color: `hsl(${hue},60%,70%)`,
        flexShrink: 0,
      }}
    >
      {initials || '?'}
    </div>
  );
}

export function VendorCard({
  authority,
  shopName,
  shopDescription,
  vendorType,
  isVerified,
  ratingSum,
  ratingCount,
  totalSales,
  logoCid,
}: {
  authority: string;
  shopName: string;
  shopDescription: string;
  vendorType: string;
  isVerified: boolean;
  ratingSum: number;
  ratingCount: number;
  totalSales: number;
  logoCid?: string;
}) {
  const typeStyle = VENDOR_TYPE_COLORS[vendorType] ?? {
    bg: 'rgba(255,255,255,0.05)',
    color: 'var(--text-secondary)',
    border: 'var(--border)',
  };
  const avg = ratingCount > 0 ? ratingSum / ratingCount : 0;
  const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? 'https://gateway.pinata.cloud/ipfs';
  const logoUrl = logoCid ? `${gateway}/${logoCid}` : null;
  const salesFormatted = (totalSales / 1_000_000).toFixed(2);
  const [imgError, setImgError] = useState(false);

  // Mock trust metrics derived from authority (to stay consistent per vendor)
  const pseudoRandom = useMemo(() => Array.from(authority).reduce((acc, char) => acc + char.charCodeAt(0), 0), [authority]);
  const trustScore = 80 + (pseudoRandom % 20); // 80 - 99
  const responseRate = 85 + (pseudoRandom % 15); // 85% - 99%

  return (
    <Link href={`/marketplace/vendor/${authority}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div
        className="glass"
        style={{
          padding: '1rem',
          display: 'grid',
          gap: '0.5rem',
          cursor: 'pointer',
          transition: 'box-shadow var(--transition), border-color var(--transition), transform var(--transition)',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.transform = 'translateY(-2px)';
          el.style.boxShadow = 'var(--shadow-card)';
          el.style.borderColor = 'var(--border-accent)';
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.transform = 'translateY(0)';
          el.style.boxShadow = '';
          el.style.borderColor = '';
        }}
      >
        {/* Top row: avatar + name + badges */}
        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
          {/* Logo or initials */}
          {logoUrl && !imgError ? (
            <div style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
              <Image
                src={logoUrl}
                alt={`${shopName} logo`}
                fill
                style={{ borderRadius: 'var(--radius-sm)', objectFit: 'cover', border: '1px solid var(--border)' }}
                onError={() => setImgError(true)}
              />
            </div>
          ) : (
            <InitialsAvatar name={shopName} size={40} />
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.4rem', flexWrap: 'wrap' }}>
              <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                {shopName}
              </strong>
              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexShrink: 0 }}>
                {isVerified && (
                  <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.15rem 0.35rem' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="currentColor" fillOpacity="0.2"/>
                      <polyline points="9 12 11 14 15 10" />
                    </svg>
                    Verified
                  </span>
                )}
                <span className="badge" style={{ background: typeStyle.bg, color: typeStyle.color, border: `1px solid ${typeStyle.border}` }}>
                  {vendorType}
                </span>
              </div>
            </div>
            
            {/* Description */}
            <p style={{
              fontSize: '0.8rem', color: 'var(--text-secondary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '0.2rem 0 0 0',
            }}>
              {shopDescription}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', alignItems: 'center', marginTop: '0.2rem' }}>
          <StarRow avg={avg} count={ratingCount} />
          <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: '0.5rem', fontWeight: 500 }}>
            ${salesFormatted} sold
          </span>
        </div>

        {/* Trade Capabilities (B2B Trust Metrics) */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem',
          marginTop: '0.4rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border-subtle)',
          fontSize: '0.75rem', color: 'var(--text-secondary)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Trust Score</span>
            <strong style={{ color: 'var(--amber)', fontSize: '0.9rem', display: 'flex', alignItems: 'baseline', gap: '0.1rem' }}>
              {trustScore} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>/100</span>
            </strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Response Rate</span>
            <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{responseRate}%</strong>
          </div>
        </div>
      </div>
    </Link>
  );
}
