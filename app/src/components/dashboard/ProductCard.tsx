'use client';

import * as React from "react";
import { ShieldCheck, Zap, ShoppingCart, Plus, ArrowRight, Star } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/useToast";
import { toAtoms } from "@/lib/units";

type ProductCardProps = {
  productId: string;
  title: string;
  category: string;
  vendor: string;
  sellerWallet: string;
  sellerTier: "distributor" | "wholesaler" | "manufacturer";
  rating: number;
  priceUsdc: number; // In Dollars (e.g. 8950.00) based on dashboard usage
  moq: number;
  leadTimeDays: number;
  usdcMint: string;
  isVerified?: boolean;
  onBuy: (payload: {
    productId: string;
    title: string;
    sellerWallet: string;
    usdcMint: string;
    tier: "distributor" | "wholesaler" | "manufacturer";
    moq: number;
    leadTimeDays: number;
    priceUsdc?: number;
  }) => void;
};

const formatter = new Intl.NumberFormat("en-US", {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

const tierConfig = {
  manufacturer: {
    label: "Manufacturer",
    badge: "Factory Direct",
    bg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    icon: Zap,
  },
  wholesaler: {
    label: "Wholesaler",
    badge: "Bulk Stock",
    bg: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    icon: Zap,
  },
  distributor: {
    label: "Distributor",
    badge: "Express Distribution",
    bg: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    icon: Zap,
  },
};

export function ProductCard({
  productId, title, category, vendor, sellerWallet, sellerTier,
  rating, priceUsdc, moq, leadTimeDays, usdcMint, isVerified = true, onBuy,
}: ProductCardProps) {
  const tier = tierConfig[sellerTier] || tierConfig.wholesaler;
  const { addItem, items } = useCart();
  const { success } = useToast();
  const [adding, setAdding] = React.useState(false);

  const inCart = items.some(i => i.listingPubkey === productId);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (adding) return;
    
    setAdding(true);
    const priceAtoms = toAtoms(priceUsdc);
    
    addItem({
      listingPubkey: productId,
      vendorPubkey: sellerWallet,
      vendorAuthority: sellerWallet,
      title,
      priceUsdc: priceAtoms,
      quantity: moq,
      tier: sellerTier,
      moq,
      leadTimeDays,
    });

    success(`Requisition updated: ${title.slice(0, 20)}...`);
    setTimeout(() => setAdding(false), 800);
  };

  const handleQuickBuy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onBuy({ productId, title, sellerWallet, usdcMint, tier: sellerTier, moq, leadTimeDays, priceUsdc });
  };

  return (
    <article className="group glass flex flex-col overflow-hidden transition-all duration-500 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5">
      {/* Visual Header */}
      <div className="relative h-44 w-full bg-gradient-to-br from-secondary via-background to-secondary/50">
        <div className="absolute inset-0 flex items-center justify-center opacity-10 transition-opacity group-hover:opacity-20">
           <div className="text-6xl font-black tracking-tighter uppercase select-none">
             {category.split(" ").map(w => w[0]).join("")}
           </div>
        </div>
        
        {/* Badges */}
        <div className="absolute inset-x-3 top-3 flex items-center justify-between">
          <div className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[9px] font-black uppercase tracking-widest ${tier.bg}`}>
            <tier.icon size={10} />
            {tier.badge}
          </div>
          {isVerified && (
            <div className="flex items-center gap-1 rounded-lg bg-background/90 px-2 py-1 border border-border shadow-sm">
              <ShieldCheck size={12} className="text-green-500" />
              <span className="text-[9px] font-black text-foreground uppercase tracking-tighter">Verified SKU</span>
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1.5">
            {category}
          </p>
          <h3 className="text-base font-bold leading-tight text-foreground line-clamp-2 min-h-[44px] group-hover:text-primary transition-colors">
            {title}
          </h3>
        </div>

        {/* Pricing Matrix */}
        <div className="mt-auto grid grid-cols-2 gap-4 border-t border-border/50 pt-4">
          <div>
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Unit Price</p>
            <p className="text-xl font-black text-foreground tracking-tight mt-0.5">
              {formatter.format(priceUsdc)}
            </p>
          </div>
          <div className="text-right">
             <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Min. Quantity</p>
             <p className="text-sm font-bold text-foreground mt-1">
              {moq} <span className="text-[10px] text-muted-foreground uppercase ml-0.5">Units</span>
            </p>
          </div>
        </div>

        {/* Institutional Stats */}
        <div className="mt-5 flex items-center justify-between rounded-xl border border-border/50 bg-secondary/30 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 text-xs font-bold text-foreground">
              <Star size={12} className="text-amber-500" />
              {rating.toFixed(1)}
            </div>
            <div className="h-3 w-px bg-border" />
            <span className="text-[10px] font-bold text-muted-foreground truncate max-w-[80px]">{vendor}</span>
          </div>
          <div className="flex items-center gap-1 text-[9px] font-black text-primary uppercase">
            <span>{leadTimeDays}D Est. Delivery</span>
          </div>
        </div>

        {/* Dynamic Actions */}
        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleQuickBuy}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/20 active:scale-[0.97]"
          >
            BUY NOW
            <ArrowRight size={12} />
          </button>
          
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={adding}
            className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-[10px] font-black transition-all active:scale-[0.97] ${
              inCart || adding
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-white/10 bg-white/5 text-foreground hover:bg-white/10 hover:border-white/20"
            }`}
          >
            {adding ? (
              <span className="animate-pulse">ADDING...</span>
            ) : inCart ? (
              <>IN CART</>
            ) : (
              <>
                <Plus size={12} />
                ADD TO CART
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
