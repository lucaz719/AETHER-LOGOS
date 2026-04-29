import MarketplaceBrowse from "./client";
import { SearchBar } from "@/components/SearchBar";

export const metadata = { title: "Marketplace | AETHER-LOGOS" };

export default function MarketplacePage() {
  return (
    <main style={{ minHeight: '100vh' }}>
      <section style={{ padding: '3rem 1.25rem 2rem', borderBottom: '1px solid rgba(0,212,255,0.1)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
            Marketplace
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
            Discover products from verified vendors. Every transaction is secured by on-chain escrow.
          </p>
          <div style={{ marginTop: "1.25rem", maxWidth: 720 }}>
            <SearchBar />
          </div>
        </div>
      </section>

      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.25rem' }}>
        <MarketplaceBrowse />
      </section>
    </main>
  );
}
