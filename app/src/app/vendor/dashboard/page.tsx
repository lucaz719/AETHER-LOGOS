'use client';

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAnchorClient } from "@/hooks/useAnchorClient";
import { fetchAgent } from "@/lib/agentApi";

interface Vendor {
  id: number;
  wallet: string;
  shop_name: string;
  description: string;
  vendor_type: string;
  categories: string;
  email_hash: string;
  created_at: string;
}

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

interface TradeAccount {
  pubkey: string;
  account: {
    buyer: { toBase58(): string };
    seller: { toBase58(): string };
    total_amount: string;
    status: Record<string, unknown>;
  };
}

const CATEGORIES = ['Electronics', 'Apparel', 'HomeGoods', 'Machinery', 'FoodBeverage', 'Chemicals', 'Automotive', 'Healthcare'];

export default function VendorDashboardPage() {
  const { publicKey } = useWallet();
  const { escrowProgram } = useAnchorClient();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [trades, setTrades] = useState<TradeAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price_usdc: '',
    category: CATEGORIES[0],
    image_url: '',
  });
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const walletAddr = publicKey?.toBase58();

  useEffect(() => {
    if (!walletAddr) return;

    const fetchData = async () => {
      try {
        // Fetch vendor profile
        const vendorRes = await fetchAgent(`http://localhost:8080/api/vendor/${walletAddr}`);
        if (vendorRes.ok) {
          const vendorData = await vendorRes.json();
          setVendor(vendorData);

          // Fetch products
          const productsRes = await fetchAgent(`http://localhost:8080/api/products?vendor=${walletAddr}`);
          if (productsRes.ok) {
            const productsData = await productsRes.json();
            setProducts(productsData.products || []);
          }
        }

        // Fetch trades where vendor is seller
        if (escrowProgram) {
          const allTrades = await (escrowProgram.account as any).tradeAccount.all();
          const vendorTrades = allTrades.filter((t: TradeAccount) => 
            t.account.seller.toBase58() === walletAddr
          );
          setTrades(vendorTrades);
        }
      } catch (error) {
        console.error('Error fetching vendor data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [walletAddr, escrowProgram]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddr) return;

    setFormLoading(true);
    setMessage(null);

    try {
      const response = await fetchAgent('http://localhost:8080/api/vendor/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_wallet: walletAddr,
          title: formData.title,
          description: formData.description,
          price_usdc: parseFloat(formData.price_usdc),
          category: formData.category,
          image_url: formData.image_url,
        }),
      });

      if (response.ok) {
        const newProduct = await response.json();
        setProducts((prev) => [...prev, newProduct]);
        setFormData({ title: '', description: '', price_usdc: '', category: CATEGORIES[0], image_url: '' });
        setMessage({ tone: 'success', text: 'Product added successfully.' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ tone: 'error', text: 'Failed to add product.' });
      }
    } catch (error) {
      console.error('Error adding product:', error);
      setMessage({ tone: 'error', text: 'Error adding product.' });
    } finally {
      setFormLoading(false);
    }
  };

  const totalProducts = products.length;
  const totalOrders = trades.length;
  const totalValue = trades.reduce((sum, trade) => {
    return sum + Number(trade.account.total_amount || 0) / 1_000_000;
  }, 0);

  if (!publicKey) {
    return (
      <main style={{ textAlign: "center", paddingTop: "4rem", minHeight: '100vh' }}>
        <h2 style={{ color: "var(--text-primary)", marginBottom: "0.5rem" }}>Vendor Dashboard</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>Connect your wallet to access your vendor dashboard.</p>
        <WalletMultiButton />
      </main>
    );
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', padding: '2rem 1.25rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ background: 'rgba(0,212,255,0.05)', borderRadius: '8px', padding: '2rem', textAlign: 'center' }}>
            Loading vendor data...
          </div>
        </div>
      </main>
    );
  }

  if (!vendor) {
    return (
      <main style={{ minHeight: '100vh', padding: '2rem 1.25rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "1.5rem" }}>Vendor Dashboard</h1>
          <div
            className="glass"
            style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}
          >
            <p style={{ marginBottom: "1.25rem" }}>You haven&apos;t registered a vendor shop yet.</p>
            <Link href="/vendor/register" className="btn-primary" style={{ textDecoration: "none" }}>
              Register as Vendor
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', padding: '2rem 1.25rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Vendor Profile Section */}
        <section style={{ marginBottom: '2.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(0,212,255,0.1)' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            {vendor.shop_name}
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            {vendor.description}
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div className="glass" style={{ padding: '0.75rem 1rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Type:</span>{' '}
              <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>{vendor.vendor_type}</span>
            </div>
            <div className="glass" style={{ padding: '0.75rem 1rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Categories:</span>{' '}
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>{vendor.categories}</span>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
          <div className="glass" style={{ padding: '1.5rem' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Products</div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--cyan)', marginTop: '0.5rem' }}>
              {totalProducts}
            </div>
          </div>
          <div className="glass" style={{ padding: '1.5rem' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Orders</div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--violet)', marginTop: '0.5rem' }}>
              {totalOrders}
            </div>
          </div>
          <div className="glass" style={{ padding: '1.5rem' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Value</div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--green)', marginTop: '0.5rem' }}>
              ${totalValue.toFixed(2)}
            </div>
          </div>
        </section>

        {/* Add Product Section */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem' }}>
            Add New Product
          </h2>
          <form onSubmit={handleAddProduct} style={{ display: 'grid', gap: '1rem', maxWidth: '600px' }}>
            <input
              type="text"
              placeholder="Product Title"
              className="input"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
            <textarea
              placeholder="Description"
              className="input"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ minHeight: '80px', fontFamily: 'inherit' }}
            />
            <input
              type="number"
              placeholder="Price (USDC)"
              className="input"
              value={formData.price_usdc}
              onChange={(e) => setFormData({ ...formData, price_usdc: e.target.value })}
              step="0.01"
              required
            />
            <select
              className="input"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <input
              type="url"
              placeholder="Image URL"
              className="input"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
            />
            {message && (
              <div style={{
                padding: '0.75rem 1rem',
                background: message.tone === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                color: message.tone === 'success' ? 'var(--green)' : 'var(--red)',
                borderRadius: '6px',
                fontSize: '0.9rem',
                border: `1px solid ${message.tone === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
              }}>
                {message.text}
              </div>
            )}
            <button
              type="submit"
              className="btn-primary"
              disabled={formLoading}
              style={{ cursor: formLoading ? 'not-allowed' : 'pointer', opacity: formLoading ? 0.6 : 1 }}
            >
              {formLoading ? 'Adding...' : 'Add Product'}
            </button>
          </form>
        </section>

        {/* Products List Section */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem' }}>
            My Products ({products.length})
          </h2>
          {products.length === 0 ? (
            <div className="glass" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No products yet. Add your first product above!
            </div>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid rgba(0,212,255,0.2)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,212,255,0.05)', borderBottom: '1px solid rgba(0,212,255,0.2)' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Title</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Price</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Category</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(product => (
                    <tr key={product.id} style={{ borderBottom: '1px solid rgba(0,212,255,0.1)' }}>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{product.title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          {product.description.slice(0, 60)}...
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', color: 'var(--cyan)', fontWeight: 600 }}>
                        ${product.price_usdc.toFixed(2)}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.65rem',
                          background: 'rgba(0,212,255,0.08)',
                          color: 'var(--cyan)',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          border: '1px solid rgba(0,212,255,0.2)'
                        }}>
                          {product.category}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', color: product.in_stock ? 'var(--green)' : 'var(--red)' }}>
                        {product.in_stock ? 'In Stock' : 'Out of Stock'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Orders Section */}
        <section>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem' }}>
            My Orders ({trades.length})
          </h2>
          {trades.length === 0 ? (
            <div className="glass" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No orders yet. Share your products to get started!
            </div>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid rgba(0,212,255,0.2)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,212,255,0.05)', borderBottom: '1px solid rgba(0,212,255,0.2)' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Trade ID</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Buyer</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Amount</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map(trade => {
                    const status = Object.keys(trade.account.status as Record<string, unknown>)[0] || 'Unknown';
                    return (
                      <tr key={trade.pubkey} style={{ borderBottom: '1px solid rgba(0,212,255,0.1)' }}>
                        <td style={{ padding: '0.75rem', color: 'var(--cyan)', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          {trade.pubkey.slice(0, 8)}...{trade.pubkey.slice(-8)}
                        </td>
                        <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          {trade.account.buyer.toBase58().slice(0, 8)}...
                        </td>
                        <td style={{ padding: '0.75rem', color: 'var(--green)', fontWeight: 600 }}>
                          ${(Number(trade.account.total_amount || 0) / 1_000_000).toFixed(2)}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.65rem',
                            background: status === 'EscrowLocked' ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)',
                            color: status === 'EscrowLocked' ? 'var(--amber)' : 'var(--green)',
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            border: `1px solid ${status === 'EscrowLocked' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}`
                          }}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

