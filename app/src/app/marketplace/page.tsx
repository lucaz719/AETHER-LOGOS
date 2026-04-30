import MarketplaceBrowse from "./client";
import { SearchBar } from "@/components/SearchBar";
import { CategoryNav } from "@/components/CategoryNav";

export const metadata = { title: "Marketplace | AETHER-LOGOS" };

export default function MarketplacePage() {
  return (
    <main style={{ minHeight: '100vh' }}>

      {/* ── Hero Banner ──────────────────────────────────────────────── */}
      <section
        style={{
          background: 'linear-gradient(160deg, rgba(0,212,255,0.07) 0%, rgba(124,58,237,0.08) 60%, transparent 100%)',
          borderBottom: '1px solid rgba(0,212,255,0.12)',
          padding: '2.5rem 1.25rem 2rem',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* Headline */}
          <div style={{ marginBottom: '1.25rem' }}>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.4rem', lineHeight: 1.15 }}>
              Global B2B Marketplace
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: 600 }}>
              Source products from verified on-chain suppliers. Every order locked in Solana escrow.
            </p>
          </div>

          {/* Search bar */}
          <div style={{ maxWidth: 680, marginBottom: '1.5rem' }}>
            <SearchBar />
          </div>

          {/* Trust badges row */}
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
            {[
              { icon: '🔒', label: 'On-Chain Escrow' },
              { icon: '✓',  label: 'Verified Suppliers' },
              { icon: '⚡', label: 'Instant Settlement' },
              { icon: '🌐', label: '220+ Countries' },
              { icon: '💎', label: 'Tokenized Products' },
            ].map((b) => (
              <span key={b.label} style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ color: 'var(--cyan)' }}>{b.icon}</span>
                {b.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Category Nav Strip ───────────────────────────────────────── */}
      <section
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          padding: '0.75rem 1.25rem',
          background: 'var(--bg-surface)',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <CategoryNav />
        </div>
      </section>

      {/* ── Product Browse (sidebar + grid) ──────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '1.75rem 1.25rem 3rem' }}>
        <MarketplaceBrowse />
      </section>

    </main>
  );
}
