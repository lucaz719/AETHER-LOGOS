type MarketplaceFiltersProps = {
  categories: string[];
  selectedTier?: string;
  onTierChange?: (value: string) => void;
};

export function MarketplaceFilters({ categories, selectedTier = "all", onTierChange }: MarketplaceFiltersProps) {
  return (
    <aside className="rounded-lg border border-border bg-card p-4 shadow-sm lg:sticky lg:top-24">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground">Filters</h2>

      <section className="mb-5 space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Seller Tier</h3>
        {[
          { label: "All tiers", value: "all" },
          { label: "Direct Manufacturer", value: "manufacturer" },
          { label: "Verified Wholesaler", value: "wholesaler" },
          { label: "Certified Distributor", value: "distributor" },
        ].map((tier) => (
          <label key={tier.value} className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="radio"
              name="tier"
              value={tier.value}
              checked={selectedTier === tier.value}
              onChange={(event) => onTierChange?.(event.target.value)}
              className="h-4 w-4 border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            {tier.label}
          </label>
        ))}
      </section>

      <section className="mb-5 space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Categories</h3>
        {categories.map((category, index) => (
          <label key={category} className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              defaultChecked={index === 0}
              className="h-4 w-4 rounded border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            {category}
          </label>
        ))}
      </section>

      <section className="mb-5 space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Vendor Rating</h3>
        {[5, 4.5, 4].map((rating, index) => (
          <label key={rating} className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="radio"
              name="rating"
              defaultChecked={index === 1}
              className="h-4 w-4 border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            {rating}+ stars
          </label>
        ))}
      </section>

      <section className="mb-5 space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Price (USDC)</h3>
        <div className="grid grid-cols-2 gap-2">
          {["< 500", "500-1.5K", "1.5K-5K", "5K+"].map((band) => (
            <button
              key={band}
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-2 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {band}
            </button>
          ))}
        </div>
      </section>

      <button
        type="button"
        className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Apply Filters
      </button>
    </aside>
  );
}
