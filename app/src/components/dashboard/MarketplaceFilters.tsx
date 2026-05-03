import { Filter, Star, Tag, ChevronRight } from "lucide-react";

type MarketplaceFiltersProps = {
  categories: string[];
  selectedTier?: string;
  onTierChange?: (value: string) => void;
};

export function MarketplaceFilters({ categories, selectedTier = "all", onTierChange }: MarketplaceFiltersProps) {
  return (
    <aside className="lg:sticky lg:top-32 space-y-6">
      <div className="rounded-2xl border border-gray-200/60 dark:border-white/10 bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl overflow-hidden shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)]">
        {/* Header */}
        <div className="bg-gray-50/80 dark:bg-white/5 px-5 py-4 border-b border-gray-100 dark:border-white/5">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Filter size={13} className="text-indigo-600 dark:text-indigo-400" /> 
            Refine Selection
          </h3>
        </div>

        <div className="p-5 space-y-8">
          {/* Categories section */}
          <div>
            <h4 className="mb-4 text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400">
               Category
            </h4>
            <ul className="space-y-1">
              {categories.map((category) => (
                <li key={category}>
                  <button className="w-full flex items-center justify-between py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 rounded-xl px-3 transition-all text-left group">
                    <span className="font-semibold">{category}</span>
                    <ChevronRight size={14} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-indigo-600 dark:text-indigo-400" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Supplier Tier */}
          <div>
            <h4 className="mb-4 text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400">
               Supplier Type
            </h4>
            <div className="space-y-3.5 px-1">
              {[
                { label: "All Suppliers", value: "all" },
                { label: "Manufacturer", value: "manufacturer" },
                { label: "Wholesaler", value: "wholesaler" },
                { label: "Distributor", value: "distributor" },
              ].map((tier) => (
                <label key={tier.value} className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="radio"
                      name="tier"
                      value={tier.value}
                      checked={selectedTier === tier.value}
                      onChange={(event) => onTierChange?.(event.target.value)}
                      className="peer sr-only"
                    />
                    <div className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-gray-600 peer-checked:border-indigo-600 dark:peer-checked:border-indigo-400 transition-all"></div>
                    <div className="absolute h-2.5 w-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400 scale-0 peer-checked:scale-100 transition-transform shadow-[0_0_10px_rgba(79,70,229,0.4)]"></div>
                  </div>
                  <span className={`text-sm transition-colors ${selectedTier === tier.value ? "text-gray-900 dark:text-white font-bold" : "text-gray-700 dark:text-gray-300 group-hover:text-gray-950 dark:group-hover:text-gray-100"}`}>
                    {tier.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div>
            <h4 className="mb-4 text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400">
               Minimum Rating
            </h4>
            <div className="space-y-3.5 px-1">
              {[5, 4.5, 4].map((rating, index) => (
                <label key={rating} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="rating"
                    defaultChecked={index === 1}
                    className="h-5 w-5 border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-transparent rounded-full"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-950 dark:group-hover:text-gray-100 transition-colors font-semibold">
                      {rating} Stars
                    </span>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          size={11} 
                          className={i < Math.floor(rating) ? "fill-amber-400 text-amber-400" : "text-gray-200 dark:text-gray-700"} 
                        />
                      ))}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
