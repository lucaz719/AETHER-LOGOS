'use client';

export function DashboardStatsOverview() {
  return (
    <div className="mt-8 rounded-2xl bg-secondary/30 p-5 border border-border/50">
      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Protocol Status</h4>
      <div className="space-y-1">
        <div className="flex items-center justify-between py-1.5 border-b border-border/30">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Settlement</span>
          <span className="text-[11px] font-black text-green-500">Active</span>
        </div>
        <div className="flex items-center justify-between py-1.5 border-b border-border/30">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">zkTLS Nodes</span>
          <span className="text-[11px] font-black text-green-500">Synced</span>
        </div>
        <div className="flex items-center justify-between py-1.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Escrow TVL</span>
          <span className="text-[11px] font-black text-primary">$1.2M</span>
        </div>
      </div>
    </div>
  );
}
