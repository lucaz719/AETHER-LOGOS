type MarketCardProps = {
  title: string;
  category: string;
  yesProbability: number;
  volume24h: number;
  openInterest: number;
  resolution: string;
};

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function MarketCard({
  title,
  category,
  yesProbability,
  volume24h,
  openInterest,
  resolution,
}: MarketCardProps) {
  const noProbability = Math.max(0, 100 - yesProbability);
  const yesPrice = yesProbability / 100;
  const noPrice = noProbability / 100;

  return (
    <article className="rounded-lg border border-surface-border bg-surface-panel p-5 shadow-sm transition-colors duration-150 hover:border-slate-400">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{category}</p>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        </div>
        <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
          {resolution}
        </span>
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Probability</span>
          <span className="font-mono text-sm tabular-nums text-slate-700">
            Yes {yesProbability.toFixed(1)}% / No {noProbability.toFixed(1)}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
          <div className="h-full bg-market-yes" style={{ width: `${yesProbability}%` }} />
        </div>
      </div>

      <dl className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <dt className="text-xs text-slate-500">24h Volume</dt>
          <dd className="font-mono text-sm font-medium tabular-nums text-slate-900">
            {usdCompact.format(volume24h)}
          </dd>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <dt className="text-xs text-slate-500">Open Interest</dt>
          <dd className="font-mono text-sm font-medium tabular-nums text-slate-900">
            {usdCompact.format(openInterest)}
          </dd>
        </div>
      </dl>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center rounded-md bg-market-yes px-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-market-yes focus-visible:ring-offset-2"
        >
          Yes {usd.format(yesPrice)}
        </button>
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center rounded-md bg-market-no px-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-market-no focus-visible:ring-offset-2"
        >
          No {usd.format(noPrice)}
        </button>
      </div>
    </article>
  );
}
