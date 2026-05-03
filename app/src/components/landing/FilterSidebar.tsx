type FilterSidebarProps = {
  categories: string[];
  ratings: Array<4 | 4.5 | 5>;
};

export function FilterSidebar({ categories, ratings }: FilterSidebarProps) {
  return (
    <aside className="rounded-lg border border-surface-border bg-surface-panel p-5 shadow-sm lg:sticky lg:top-24">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-700">Filter Suppliers</h3>

      <div className="space-y-5">
        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-900">Category</h4>
          <div className="space-y-2">
            {categories.map((category) => (
              <label key={category} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-market-yes focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-market-yes focus-visible:ring-offset-2"
                  defaultChecked={category === "Industrial Components"}
                />
                {category}
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-900">Price Band</h4>
          <div className="grid grid-cols-2 gap-2">
            {["< 200 USDC", "200–750", "750–2,000", "2,000+"].map((band) => (
              <button
                key={band}
                type="button"
                className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2"
              >
                {band}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-900">Vendor Rating</h4>
          <div className="space-y-2">
            {ratings.map((rating) => (
              <label key={rating} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="rating"
                  className="h-4 w-4 border-slate-300 text-market-yes focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-market-yes focus-visible:ring-offset-2"
                  defaultChecked={rating === 4.5}
                />
                {rating}+ stars
              </label>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2"
        >
          Reset
        </button>
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
        >
          Apply
        </button>
      </div>
    </aside>
  );
}
