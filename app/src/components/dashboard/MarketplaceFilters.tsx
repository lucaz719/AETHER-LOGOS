import { Filter, Star, Tag, ChevronRight } from "lucide-react";

type MarketplaceFiltersProps = {
  categories: string[];
  selectedTier?: string;
  onTierChange?: (value: string) => void;
};

export function MarketplaceFilters({ categories, selectedTier = "all", onTierChange }: MarketplaceFiltersProps) {
  return (
    <aside className="lg:sticky lg:top-32 space-y-6">
      <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl overflow-hidden shadow-sm">
        {/* Header */}
        <div className="bg-secondary px-5 py-4 border-b border-border">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
            <Filter size={13} className="text-primary" /> 
            Refine Selection
          </h3>
        </div>

        <div className="p-5 space-y-8">
          {/* Categories section */}
          <div>
            <h4 className="mb-4 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
               Category
            </h4>
            <ul className="space-y-1">
              {categories.map((category) => (
                <li key={category}>
                  <button className="w-full flex items-center justify-between py-2.5 text-sm text-foreground/70 hover:text-primary hover:bg-primary/5 rounded-xl px-3 transition-all text-left group">
                    <span className="font-semibold">{category}</span>
                    <ChevronRight size={14} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
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
              {[5, 4.5, 4].map((rating, index) => (
                <label key={rating} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="rating"
                    defaultChecked={index === 1}
                    className="h-5 w-5 border-border text-primary focus:ring-primary bg-transparent rounded-full"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors font-semibold">
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
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
