type VendorListing = {
  id: string;
  title: string;
  category: string;
  priceUsdc: number;
  moq: string;
  leadTime: string;
  vendor: string;
  rating: number;
};

type VendorStorefrontProps = {
  listings: VendorListing[];
};

const usdc = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function VendorStorefront({ listings }: VendorStorefrontProps) {
  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-2 rounded-lg border border-surface-border bg-surface-panel p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Dealer Marketplace</h3>
          <p className="text-sm text-slate-600">Verified inventory with escrow-backed settlement in USDC.</p>
        </div>
        <button
          type="button"
          className="inline-flex h-10 min-w-40 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
        >
          Source Request
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {listings.map((listing) => (
          <article key={listing.id} className="rounded-lg border border-surface-border bg-white shadow-sm">
            <div
              className="aspect-[4/3] w-full rounded-t-lg border-b border-surface-border bg-slate-100"
              role="img"
              aria-label={`${listing.title} listing image`}
            />
            <div className="space-y-4 p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{listing.category}</p>
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                    Verified Dealer
                  </span>
                </div>
                <h4 className="text-base font-semibold text-slate-900">{listing.title}</h4>
              </div>

              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">Price</dt>
                  <dd className="font-mono text-base font-semibold tabular-nums text-slate-900">
                    {usdc.format(listing.priceUsdc)} USDC
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">MOQ</dt>
                  <dd className="text-slate-800">{listing.moq}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Lead Time</dt>
                  <dd className="text-slate-800">{listing.leadTime}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Vendor Rating</dt>
                  <dd className="font-mono tabular-nums text-slate-800">{listing.rating.toFixed(1)} / 5.0</dd>
                </div>
              </dl>

              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                Supplier: <span className="font-semibold text-slate-900">{listing.vendor}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                >
                  Trade Now
                </button>
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2"
                >
                  Make Offer
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
