'use client';

type StoresStatsOverviewProps = {
  total: number;
  verified: number;
  followed: number;
};

export function StoresStatsOverview({ total, verified, followed }: StoresStatsOverviewProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px] lg:grid-cols-3">
      <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Suppliers</p>
        <p className="mt-1 text-2xl font-black text-foreground">{total}</p>
      </div>
      <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Verified</p>
        <p className="mt-1 text-2xl font-black text-foreground">{verified}</p>
      </div>
      <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Followed</p>
        <p className="mt-1 text-2xl font-black text-foreground">{followed}</p>
      </div>
    </div>
  );
}
