'use client';

import { CheckCircle2, ShieldCheck, Zap } from "lucide-react";

type ProductCardProps = {
  productId: string;
  title: string;
  category: string;
  vendor: string;
  sellerWallet: string;
  sellerTier: "distributor" | "wholesaler" | "manufacturer";
  rating: number;
  priceUsdc: number;
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

const usdc = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const tierConfig = {
  manufacturer: { label: "Direct", badge: "Factory", bg: "bg-emerald-50 text-emerald-700 border-emerald-100", darkBg: "dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" },
  wholesaler: { label: "Wholesale", badge: "Bulk", bg: "bg-blue-50 text-blue-700 border-blue-100", darkBg: "dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20" },
  distributor: { label: "Distributor", badge: "Express", bg: "bg-orange-50 text-orange-700 border-orange-100", darkBg: "dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20" },
};

export function ProductCard({
  productId, title, category, vendor, sellerWallet, sellerTier,
  rating, priceUsdc, moq, leadTimeDays, usdcMint, isVerified = true, onBuy,
}: ProductCardProps) {
  const tier = tierConfig[sellerTier];

  return (
    <article className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:shadow-2xl hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-indigo-500/50">
      {/* Dynamic Header */}
      <div className="relative h-40 w-full overflow-hidden rounded-t-2xl bg-slate-50 dark:bg-slate-800/50">
        <div className="absolute inset-0 flex items-center justify-center">
           <div className="text-4xl font-black text-slate-200 dark:text-slate-700 select-none tracking-tighter">
             {category.split(" ").map(w => w[0]).join("")}
           </div>
        </div>
        
        {/* Tier Badge */}
        <div className={`absolute top-3 left-3 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${tier.bg} ${tier.darkBg}`}>
          <Zap size={10} className="fill-current" />
          {tier.badge}
        </div>

        {/* Verification Status */}
        {isVerified && (
          <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-white/90 dark:bg-slate-900/90 px-2 py-1 shadow-sm border border-slate-100 dark:border-slate-800">
            <ShieldCheck size={12} className="text-indigo-600 dark:text-indigo-400" />
            <span className="text-[9px] font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Verified SKU</span>
          </div>
        )}
      </div>

      {/* Main Details */}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            {category}
          </span>
          <h3 className="mt-1 text-sm font-bold leading-tight text-slate-900 dark:text-slate-100 line-clamp-2 min-h-[40px] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {title}
          </h3>
        </div>

        {/* Pricing Info */}
        <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-50 dark:border-slate-800/50">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Unit Price</p>
            <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">
              ${usdc.format(priceUsdc)}
            </span>
          </div>
          <div className="text-right">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter text-right">MOQ</p>
             <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {moq} Units
            </span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-900 dark:text-white">★ {rating.toFixed(1)}</span>
            <span className="text-[10px] text-slate-400 font-medium">{vendor}</span>
          </div>
          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">{leadTimeDays}D Delivery</span>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={() =>
            onBuy({ productId, title, sellerWallet, usdcMint, tier: sellerTier, moq, leadTimeDays, priceUsdc })
          }
          className="mt-5 w-full rounded-xl bg-slate-900 py-3 text-[13px] font-bold text-white transition-all hover:bg-indigo-600 hover:shadow-xl hover:shadow-indigo-500/20 active:scale-[0.98] dark:bg-white dark:text-slate-900 dark:hover:bg-indigo-400"
        >
          Secure Trade Asset
        </button>
      </div>
    </article>
  );
}
