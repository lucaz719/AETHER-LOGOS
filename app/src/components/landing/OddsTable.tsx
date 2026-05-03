export type OddsRow = {
  market: string;
  yesPrice: number;
  noPrice: number;
  spread: number;
  volume24h: number;
};

type OddsTableProps = {
  rows: OddsRow[];
};

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function OddsTable({ rows }: OddsTableProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-surface-border bg-surface-panel shadow-sm">
      <header className="border-b border-surface-border px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">Live Odds Board</h3>
      </header>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-slate-100">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <th className="px-4 py-3">Market</th>
              <th className="px-4 py-3">Yes</th>
              <th className="px-4 py-3">No</th>
              <th className="px-4 py-3">Spread</th>
              <th className="px-4 py-3">24h Vol</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border bg-white">
            {rows.map((row) => (
              <tr key={row.market} className="text-sm text-slate-800">
                <td className="px-4 py-3 font-medium text-slate-900">{row.market}</td>
                <td className="px-4 py-3 font-mono tabular-nums text-market-yes">{usd.format(row.yesPrice)}</td>
                <td className="px-4 py-3 font-mono tabular-nums text-market-no">{usd.format(row.noPrice)}</td>
                <td className="px-4 py-3 font-mono tabular-nums text-slate-700">{row.spread.toFixed(1)}%</td>
                <td className="px-4 py-3 font-mono tabular-nums text-slate-700">
                  {usdCompact.format(row.volume24h)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
