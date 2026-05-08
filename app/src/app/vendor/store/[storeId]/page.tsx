'use client';

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Store, Package, ShieldCheck, Tag, ArrowRight, Clock, BarChart3 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8080";

interface StoreData {
  id: number;
  owner_wallet: string;
  slug: string;
  store_name: string;
  description: string;
  store_type: string;
  categories: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

interface Product {
  id: number;
  title: string;
  description: string;
  short_description?: string;
  category: string;
  price_usdc: number;
  moq?: number;
  lead_time_days?: number;
  seller_tier?: string;
  rating?: number;
  in_stock: boolean;
  image_url?: string;
}

const TIER_STYLES: Record<string, string> = {
  manufacturer: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30",
  wholesaler:   "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30",
  distributor:  "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30",
  retail:       "bg-secondary text-foreground border-border",
};

const usdc = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function StoreOverviewPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const router = useRouter();
  const { publicKey } = useWallet();

  const [store, setStore] = useState<StoreData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const isOwner = store && publicKey?.toBase58() === store.owner_wallet;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [storeRes, productsRes] = await Promise.all([
          fetch(`${API}/api/stores/${storeId}`),
          fetch(`${API}/api/stores/${storeId}/products`),
        ]);
        if (storeRes.ok) setStore(await storeRes.json());
        if (productsRes.ok) {
          const data = await productsRes.json() as { products?: Product[] };
          setProducts(data.products ?? []);
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [storeId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 rounded-2xl bg-secondary animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-secondary animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <p className="font-semibold text-destructive">Store not found.</p>
        <Link href="/dashboard" className="mt-4 inline-flex text-sm text-primary hover:underline">
          ← Back to Marketplace
        </Link>
      </div>
    );
  }

  const tierStyle = TIER_STYLES[store.store_type] ?? TIER_STYLES.retail;
  const categories = store.categories ? store.categories.split(",").map(c => c.trim()) : [];

  return (
    <div className="space-y-6">
      {/* Store Header */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Identity */}
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Store className="h-7 w-7 text-primary" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">{store.store_name}</h1>
                {store.is_verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                    <ShieldCheck size={11} />
                    Verified
                  </span>
                )}
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${tierStyle}`}>
                  {store.store_type}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                {store.description || "No description provided."}
              </p>
              {categories.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <span key={cat} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground border border-border">
                      <Tag size={10} />
                      {cat}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 gap-2">
            {isOwner && (
              <Link
                href={`/vendor/store/${store.id}/dashboard`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                <BarChart3 size={14} />
                Manage Store
              </Link>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4">
          {[
            { label: "Products", value: products.length },
            { label: "Categories", value: categories.length || 1 },
            { label: "Avg Lead Time", value: products.length > 0
              ? `${Math.round(products.reduce((s, p) => s + (p.lead_time_days ?? 7), 0) / products.length)}d`
              : "—"
            },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <p className="text-lg font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Products */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Package size={16} className="text-primary" />
            Products ({products.length})
          </h2>
          {isOwner && (
            <Link
              href={`/vendor/store/${store.id}/products`}
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              Manage <ArrowRight size={13} />
            </Link>
          )}
        </div>

        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-12 text-center">
            <Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold text-muted-foreground">No products listed yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map(product => (
              <div
                key={product.id}
                className="group flex flex-col rounded-2xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-lg"
              >
                {/* Image / Placeholder */}
                {product.image_url ? (
                  <div className="relative h-36 w-full overflow-hidden rounded-t-2xl bg-secondary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="flex h-36 w-full items-center justify-center rounded-t-2xl bg-secondary">
                    <span className="text-3xl font-black text-border select-none">
                      {product.category?.split(" ").map(w => w[0]).join("") ?? "?"}
                    </span>
                  </div>
                )}

                {/* Details */}
                <div className="flex flex-1 flex-col p-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{product.category}</span>
                  <h3 className="mt-1 text-sm font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                    {product.title}
                  </h3>
                  {product.short_description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{product.short_description}</p>
                  )}

                  <div className="mt-auto pt-3 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black text-foreground">${usdc.format(product.price_usdc)}</span>
                      {product.moq && (
                        <span className="text-xs text-muted-foreground">MOQ: {product.moq}</span>
                      )}
                    </div>
                    {product.lead_time_days && (
                      <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock size={10} />
                        {product.lead_time_days}d lead time
                        {product.rating && (
                          <span className="ml-auto font-semibold text-foreground inline-flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--amber)' }} xmlns="http://www.w3.org/2000/svg"><path d="M12 .587l3.668 7.431L24 9.753l-6 5.848L19.335 24 12 19.897 4.665 24 6 15.601 0 9.753l8.332-1.735z"/></svg>{product.rating.toFixed(1)}</span>
                        )}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => router.push(`/trades?productId=${product.id}&sellerWallet=${store.owner_wallet}&priceUsdc=${product.price_usdc}&title=${encodeURIComponent(product.title)}`)}
                      className="mt-3 w-full rounded-xl bg-foreground py-2.5 text-xs font-bold text-background transition hover:bg-primary hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
                    >
                      Secure Trade Asset
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
