'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import { useAnchorClient } from '@/hooks/useAnchorClient';
import BN from 'bn.js';

const CATEGORIES = [
  'Electronics', 'Apparel', 'HomeGoods', 'Machinery', 'FoodBeverage',
  'Chemicals', 'Automotive', 'Healthcare', 'Construction', 'Other'
];

const ESCROW_PROGRAM_ID = new PublicKey("7CN3FCG4rsVpuHPaMXtzsqb9GY7MmpNr4EYizFGKM7Gc");
const DEVNET_USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

interface Product {
  id: number;
  vendor_wallet: string;
  title: string;
  description: string;
  price_usdc: number;
  category: string;
  image_url: string;
  in_stock: boolean;
  created_at: string;
}

interface Vendor {
  id: number;
  wallet: string;
  shop_name: string;
  description: string;
  vendor_type: string;
}

export default function MarketplaceBrowseClient() {
  const { publicKey } = useWallet();
  const { escrowProgram, connection } = useAnchorClient();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Map<string, Vendor>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [buying, setBuying] = useState<number | null>(null);

  // Load products on mount or filter change
  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      setError(null);
      try {
        let url = 'http://localhost:8080/api/products';
        if (selectedCategory) {
          url += `?category=${encodeURIComponent(selectedCategory)}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load products');

        const data = await response.json();
        const prods = data.products || [];
        setProducts(prods);

        // Load vendor info for each product
        const vendorMap = new Map<string, Vendor>();
        for (const prod of prods) {
          if (!vendorMap.has(prod.vendor_wallet)) {
            try {
              const vendorRes = await fetch(`http://localhost:8080/api/vendor/${prod.vendor_wallet}`);
              if (vendorRes.ok) {
                const vendor = await vendorRes.json();
                vendorMap.set(prod.vendor_wallet, vendor);
              }
            } catch { /* vendor not found */ }
          }
        }
        setVendors(vendorMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(loadProducts, 300);
    return () => clearTimeout(timer);
  }, [selectedCategory]);

  const handleBuyNow = useCallback(
    async (product: Product) => {
      if (!publicKey) {
        setStatus({ tone: 'error', text: 'Please connect your wallet first.' });
        return;
      }

      if (!escrowProgram || !connection) {
        setStatus({ tone: 'error', text: 'Escrow program is not loaded.' });
        return;
      }

      setBuying(product.id);
      setStatus(null);
      try {
        // 1. Generate random trade ID
        const tradeId = crypto.getRandomValues(new Uint8Array(32));

        // 2. Derive PDAs
        const [tradeAccount] = PublicKey.findProgramAddressSync(
          [Buffer.from('trade'), publicKey.toBuffer(), tradeId],
          ESCROW_PROGRAM_ID
        );

        const [escrowVault] = PublicKey.findProgramAddressSync(
          [Buffer.from('vault'), tradeId],
          ESCROW_PROGRAM_ID
        );

        const [vaultAuthority] = PublicKey.findProgramAddressSync(
          [Buffer.from('authority')],
          ESCROW_PROGRAM_ID
        );

        // 3. Get buyer token account
        const { getAssociatedTokenAddress } = await import('@solana/spl-token');
        const buyerAta = await getAssociatedTokenAddress(DEVNET_USDC_MINT, publicKey);

        // 4. Get seller info
        const seller = new PublicKey(product.vendor_wallet);

        // 5. Set milestone hash to zeros
        const milestoneHash = new Uint8Array(32);

        // 6. Call create_trade
        const tx = await (escrowProgram.methods as any)
          .createTrade(
            Array.from(tradeId),
            new BN(product.price_usdc * 1_000_000),
            Array.from(milestoneHash),
            false,
            null
          )
          .accounts({
            buyer: publicKey,
            seller: seller,
            tradeAccount: tradeAccount,
            escrowVault: escrowVault,
            vaultAuthority: vaultAuthority,
            usdcMint: DEVNET_USDC_MINT,
            buyerTokenAccount: buyerAta,
            systemProgram: new PublicKey('11111111111111111111111111111111'),
            tokenProgram: new PublicKey('TokenkegQfeZyiNwAJsyFbPUwJ7SNLhSpcQ9xQmrKjT'),
            rent: new PublicKey('SysvarRent111111111111111111111111111111111'),
          })
          .rpc();

        setStatus({ tone: 'success', text: `Order created. Transaction: ${tx.slice(0, 8)}...` });

        // 7. Register with agent
        try {
          const registerRes = await fetch('http://localhost:8080/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tracking_id: '',
              wallet: publicKey.toString(),
              callback_url: '',
              carrier: '',
              trade_account: tradeAccount.toString(),
              trade_id: Buffer.from(tradeId).toString('hex'),
            }),
          });

          if (!registerRes.ok) {
            console.warn('Failed to register trade with agent');
          }
        } catch (err) {
          console.warn('Agent registration error:', err);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        setStatus({ tone: 'error', text: `Order failed: ${errMsg}` });
      } finally {
        setBuying(null);
      }
    },
    [publicKey, escrowProgram, connection]
  );

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading products...</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Browse Products</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <button
            onClick={() => setSelectedCategory('')}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: 'var(--radius-pill)',
              border: !selectedCategory ? '1px solid var(--cyan)' : '1px solid var(--border)',
              background: !selectedCategory ? 'var(--cyan-dim)' : 'transparent',
              color: !selectedCategory ? 'var(--cyan)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: 'var(--radius-pill)',
                border: selectedCategory === cat ? '1px solid var(--cyan)' : '1px solid var(--border)',
                background: selectedCategory === cat ? 'var(--cyan-dim)' : 'transparent',
                color: selectedCategory === cat ? 'var(--cyan)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ color: 'var(--red)', padding: '1rem', background: 'rgba(244,63,94,0.1)', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
          Error: {error}
        </div>
      )}
      {status && (
        <div
          style={{
            color: status.tone === 'success' ? 'var(--green)' : 'var(--red)',
            padding: '1rem',
            background: status.tone === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
          }}
        >
          {status.text}
        </div>
      )}

      {products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
          No products found
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {products.map((product) => {
            const vendor = vendors.get(product.vendor_wallet);
            return (
              <div key={product.id} className="glass" style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <h3 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    {product.title}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {product.description}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem' }}>
                  <div>
                    <div style={{ color: 'var(--cyan)', fontSize: '1.4rem', fontWeight: 800 }}>
                      ${product.price_usdc.toFixed(2)}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>USDC</div>
                  </div>
                  <div style={{ fontSize: '0.8rem', background: 'var(--text-muted)', color: 'var(--text-inverse)', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-sm)' }}>
                    {product.category}
                  </div>
                </div>

                {vendor && (
                  <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {vendor.shop_name}
                  </div>
                )}

                <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem' }}>
                  {!publicKey ? (
                    <WalletMultiButton />
                  ) : (
                    <button
                      onClick={() => handleBuyNow(product)}
                      disabled={buying === product.id}
                      style={{
                        flex: 1,
                        padding: '0.6rem 1rem',
                        background: buying === product.id ? 'var(--text-muted)' : 'var(--cyan)',
                        color: buying === product.id ? 'var(--text-secondary)' : '#000',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 700,
                        cursor: buying === product.id ? 'not-allowed' : 'pointer',
                        fontSize: '0.9rem',
                        transition: 'all 0.2s',
                      }}
                    >
                      {buying === product.id ? 'Processing...' : 'Buy Now'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
