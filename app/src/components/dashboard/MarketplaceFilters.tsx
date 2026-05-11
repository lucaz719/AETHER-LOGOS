'use client';

import { Filter, Star, ChevronRight, ChevronDown } from "lucide-react";
import { useState } from "react";

type MarketplaceFiltersProps = {
  categories: string[];
  selectedCategory?: string;
  onCategoryChange?: (value: string) => void;
  selectedTier?: string;
  onTierChange?: (value: string) => void;
  minRating?: number;
  onRatingChange?: (value: number) => void;
};

export function MarketplaceFilters({ 
  categories, 
  selectedCategory = "all", 
  onCategoryChange, 
  selectedTier = "all", 
  onTierChange,
  minRating = 0,
  onRatingChange 
}: MarketplaceFiltersProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const hasActiveFilters = selectedCategory !== "all" || selectedTier !== "all" || minRating > 0;

  const handleReset = () => {
    onCategoryChange?.("all");
    onTierChange?.("all");
    onRatingChange?.(0);
  };

  return (
    <aside className="space-y-3 lg:sticky lg:top-32">

      {/* ── Mobile toggle button (hidden on lg+) ── */}
      <button
        type="button"
        onClick={() => setMobileOpen((o) => !o)}
        aria-expanded={mobileOpen}
        className="flex min-h-[44px] w-full items-center justify-between rounded-2xl border border-border bg-card/80 px-5 py-3 text-left shadow-sm backdrop-blur-xl transition-colors hover:bg-secondary lg:hidden"
      >
        <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-foreground">
          <Filter size={13} className="text-primary" />
          Refine Selection
          {hasActiveFilters && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-black text-white leading-none">
              !
            </span>
          )}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-muted-foreground transition-transform duration-300 ${mobileOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* ── Filter panel ── always visible on lg+, toggle-controlled on mobile ── */}
      <div className={`rounded-2xl border border-border bg-card/80 backdrop-blur-xl overflow-hidden shadow-sm transition-all ${mobileOpen ? "block" : "hidden lg:block"}`}>
        {/* Desktop header */}
        <div className="bg-secondary px-5 py-4 border-b border-border flex justify-between items-center">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
            <Filter size={13} className="text-primary" /> 
            Refine Selection
          </h3>
          {hasActiveFilters && (
            <button 
              onClick={handleReset}
              className="min-h-[44px] px-3 text-[10px] font-black uppercase text-primary hover:underline"
            >
              Reset
            </button>
          )}
        </div>

        <div className="p-5 space-y-8">
          {/* Categories section */}
          <div>
            <h4 className="mb-4 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
               Category
            </h4>
            <ul className="space-y-1">
              <li>
                <button 
                  onClick={() => onCategoryChange?.("all")}
                  className={`group flex min-h-[44px] w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-all ${selectedCategory === "all" ? "bg-primary/10 text-primary" : "text-foreground/70 hover:bg-primary/5 hover:text-primary"}`}
                >
                  <span className="font-semibold">All Categories</span>
                  <ChevronRight size={14} className={`transition-all ${selectedCategory === "all" ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"}`} />
                </button>
              </li>
              {categories.map((category) => (
                <li key={category}>
                    <button 
                      onClick={() => onCategoryChange?.(category)}
                      className={`group flex min-h-[44px] w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-all ${selectedCategory === category ? "bg-primary/10 text-primary" : "text-foreground/70 hover:bg-primary/5 hover:text-primary"}`}
                    >
                    <span className="font-semibold">{category}</span>
                    <ChevronRight size={14} className={`transition-all ${selectedCategory === category ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"}`} />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Supplier Tier */}
          <div>
            <h4 className="mb-4 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
               Supplier Type
            </h4>
            <div className="space-y-3.5 px-1">
              {[
                { label: "All Suppliers", value: "all" },
                { label: "Manufacturer", value: "manufacturer" },
                { label: "Wholesaler", value: "wholesaler" },
                { label: "Distributor", value: "distributor" },
              ].map((tier) => (
                <label key={tier.value} className="group flex min-h-[44px] items-center gap-3 rounded-xl px-1.5 py-1 cursor-pointer">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="radio"
                      name="tier"
                      value={tier.value}
                      checked={selectedTier === tier.value}
                      onChange={(event) => onTierChange?.(event.target.value)}
                      className="peer sr-only"
                    />
                    <div className="h-5 w-5 rounded-full border-2 border-border peer-checked:border-primary transition-all"></div>
                    <div className="absolute h-2.5 w-2.5 rounded-full bg-primary scale-0 peer-checked:scale-100 transition-transform shadow-[0_0_10px_rgba(0,102,255,0.4)]"></div>
                  </div>
                  <span className={`text-sm transition-colors ${selectedTier === tier.value ? "text-foreground font-bold" : "text-muted-foreground group-hover:text-foreground"}`}>
                    {tier.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div>
            <h4 className="mb-4 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
               Minimum Rating
            </h4>
            <div className="space-y-3.5 px-1">
              {[5, 4.5, 4].map((rating) => (
                <label key={rating} className="group flex min-h-[44px] items-center gap-3 rounded-xl px-1.5 py-1 cursor-pointer">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="radio"
                      name="rating"
                      value={rating}
                      checked={minRating === rating}
                      onChange={() => onRatingChange?.(rating)}
                      className="peer sr-only"
                    />
                    <div className="h-5 w-5 rounded-full border-2 border-border peer-checked:border-primary transition-all"></div>
                    <div className="absolute h-2.5 w-2.5 rounded-full bg-primary scale-0 peer-checked:scale-100 transition-transform shadow-[0_0_10px_rgba(0,102,255,0.4)]"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm transition-colors ${minRating === rating ? "text-foreground font-bold" : "text-muted-foreground group-hover:text-foreground"}`}>
                      {rating} Stars
                    </span>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          size={11} 
                          className={i < Math.floor(rating) ? "fill-amber-400 text-amber-400" : "text-border"} 
                        />
                      ))}
                    </div>
                  </div>
                </label>
              ))}
              {minRating > 0 && (
                 <label className="group flex min-h-[44px] items-center gap-3 rounded-xl px-1.5 py-1 cursor-pointer">
                    <div className="relative flex items-center justify-center">
                        <input
                            type="radio"
                            name="rating"
                            value={0}
                            checked={minRating === 0}
                            onChange={() => onRatingChange?.(0)}
                            className="peer sr-only"
                        />
                        <div className="h-5 w-5 rounded-full border-2 border-border peer-checked:border-primary transition-all"></div>
                    </div>
                    <span className="text-sm text-muted-foreground">Any Rating</span>
                 </label>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
