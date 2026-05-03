type HedgeCardProps = {
  title: string;
  marketType: string;
  yesProbability: number;
  liquidity: number;
  expiry: string;
  verificationSignal: string;
};

const usdcCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function HedgeCard({ title, marketType, yesProbability, liquidity, expiry, verificationSignal }: HedgeCardProps) {
  const noProbability = Math.max(0, 100 - yesProbability);
  const yesPrice = Math.round(yesProbability);
  const noPrice = Math.round(noProbability);

  return (
    <article className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
          {marketType}
        </span>
        <span className="text-xs font-medium text-muted-foreground">{expiry}</span>
      </div>

      <h3 className="mb-4 text-base font-semibold text-card-foreground">{title}</h3>

      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Probability</span>
        <span className="font-mono text-sm tabular-nums text-foreground">
          Yes {yesProbability.toFixed(1)}% / No {noProbability.toFixed(1)}%
        </span>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-full bg-market-yes transition-[width] duration-300 ease-in-out" style={{ width: `${yesProbability}%` }} />
      </div>

      <div className="mb-4 rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
        <p className="font-mono tabular-nums text-foreground">Yes {yesPrice}c / No {noPrice}c</p>
        <p>Liquidity {usdcCompact.format(liquidity)}</p>
        <p className="mt-1">Signal: {verificationSignal}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center rounded-md bg-market-yes px-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-market-yes focus-visible:ring-offset-2"
        >
          Buy Yes
        </button>
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center rounded-md bg-market-no px-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-market-no focus-visible:ring-offset-2"
        >
          Buy No
        </button>
      </div>
    </article>
  );
}
