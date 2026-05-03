'use client';

import { useState, ReactNode } from "react";
import { CheckCircle2, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

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
  }) => void;
  skeleton?: boolean;
};

const usdc = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const tierConfig = {
  manufacturer: {
    label: "Direct Manufacturer",
    badge: "Lowest Price",
    color: "from-emerald-500 to-emerald-600",
  },
  wholesaler: {
    label: "Verified Wholesaler",
    badge: "Bulk Specialist",
    color: "from-blue-500 to-blue-600",
  },
  distributor: {
    label: "Certified Distributor",
    badge: "Fast Shipping",
    color: "from-orange-500 to-orange-600",
  },
};

function SkeletonLoader() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full"
    >
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        {/* Image skeleton */}
        <div className="aspect-video w-full bg-gray-200 dark:bg-gray-800 animate-pulse rounded-t-xl" />

        {/* Content skeleton */}
        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-32 animate-pulse" />
            <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-48 animate-pulse" />
          </div>

          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-40 animate-pulse" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            </div>
          </div>

          <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        </div>
      </div>
    </motion.div>
  );
}

export function ProductCard({
  productId,
  title,
  category,
  vendor,
  sellerWallet,
  sellerTier,
  rating,
  priceUsdc,
  moq,
  leadTimeDays,
  usdcMint,
  isVerified = true,
  onBuy,
  skeleton = false,
}: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const tier = tierConfig[sellerTier];

  if (skeleton) {
    return <SkeletonLoader />;
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all duration-200"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Product Image Placeholder */}
      <div
        className="aspect-video w-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 relative overflow-hidden"
        role="img"
        aria-label={`${title} product image placeholder`}
      >
        <motion.div
          className="w-full h-full flex items-center justify-center"
          animate={{ scale: isHovered ? 1.05 : 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-gray-300 dark:text-gray-600 font-bold text-4xl opacity-20">
            {category[0]}
          </div>
        </motion.div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Header: Category + Badge */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
            {category}
          </span>
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${tier.color} text-white shadow-sm`}>
            {tier.badge}
          </span>
        </div>

        {/* Title */}
        <div>
          <h3 className="text-lg font-bold leading-tight text-gray-900 dark:text-white">
            {title}
          </h3>
        </div>

        {/* Price Section */}
        <div className="border-t border-gray-200 dark:border-gray-800 border-b pt-3 pb-3">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">
              Price
            </span>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
              MOQ: {moq} units
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              ${usdc.format(priceUsdc)}
            </span>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
              {leadTimeDays}d lead
            </span>
          </div>
        </div>

        {/* Sold By Badge */}
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-blue-50 dark:bg-gray-800 border border-blue-100 dark:border-gray-700">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Sold by</span>
            <span className="font-semibold text-gray-900 dark:text-white truncate text-sm">
              {vendor}
            </span>
          </div>
          {isVerified && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <CheckCircle2 size={14} className="text-green-600 dark:text-green-400" />
              <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                Verified
              </span>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-800">
            <p className="text-gray-600 dark:text-gray-400 font-medium">Rating</p>
            <p className="font-mono text-sm font-bold text-gray-900 dark:text-white">
              {rating.toFixed(1)} / 5
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-800">
            <p className="text-gray-600 dark:text-gray-400 font-medium">Tier</p>
            <p className="font-semibold text-gray-900 dark:text-white truncate text-xs">
              {tier.label.split(" ")[0]}
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <motion.button
          type="button"
          onClick={() =>
            onBuy({
              productId,
              title,
              sellerWallet,
              usdcMint,
              tier: sellerTier,
              moq,
              leadTimeDays,
            })
          }
          className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold text-sm transition-all duration-200 active:scale-95 shadow-md hover:shadow-lg"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Lock in Escrow
        </motion.button>
      </div>
    </motion.article>
  );
}
