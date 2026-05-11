'use client';

import { useMemo, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { ArrowRight, BadgeCheck, Clock3, Package, ShieldCheck, Truck } from "lucide-react";
import { useBuyerOrders } from "@/hooks/useBuyerOrders";
import { PublicKey } from "@solana/web3.js";

const STATUS_META: Record<string, { label: string; tone: string }> = {
  awaitingShipment: { label: "Awaiting Shipment", tone: "badge-amber" },
  inTransit: { label: "Shipment Active", tone: "badge-violet" },
  verified: { label: "Verified", tone: "badge-green" },
  released: { label: "Settled", tone: "badge-cyan" },
  disputed: { label: "Disputed", tone: "badge-red" },
  cancelled: { label: "Cancelled", tone: "badge-red" },
};

function statusKey(status: unknown): string {
  if (!status) return "Unknown";
  if (typeof status === "string") return status;
  if (typeof status === "object") return Object.keys(status as Record<string, unknown>)[0];
  return "Unknown";
}

function shortKey(value: string | PublicKey): string {
  const str = typeof value === 'string' ? value : value?.toBase58();
  if (!str) return "Unknown";
  return `${str.slice(0, 6)}…${str.slice(-6)}`;
}

export default function UserOrdersPage() {
  const { publicKey } = useWallet();
  const [filter, setFilter] = useState<string>("");
  const { orders, loading } = useBuyerOrders();

  const allStatuses = useMemo(
    () => Array.from(new Set(orders.map((o) => statusKey(o.account.status)))).filter(Boolean),
    [orders],
  );
  
  const visible = filter ? orders.filter((o) => statusKey(o.account.status) === filter) : orders;
  const activeCount = orders.filter((o) => !["released", "cancelled"].includes(statusKey(o.account.status))).length;

  if (!publicKey) {
    return (
      <main className="flex flex-col items-center gap-4 pt-16 text-center px-4">
        <h2 className="text-xl font-black text-foreground">My Orders</h2>
        <p className="text-sm text-muted-foreground max-w-xs">Connect your wallet to view your orders.</p>
        <WalletMultiButton />
      </main>
    );
  }

  return (
    <div className="space-y-6">
      <section className="glass rounded-3xl p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="badge-pill badge-pill-primary">
              <ShieldCheck size={13} />
              Trade Management
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-foreground">My Orders</h1>
            <p className="mt-3 text-sm text-muted-foreground md:text-base">
              Summary-first order cards keep this page fast. Open a live tracking dashboard for real-time shipment and settlement details.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px] lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Orders</p>
              <p className="mt-1 text-2xl font-black text-foreground">{orders.length}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Active</p>
              <p className="mt-1 text-2xl font-black text-foreground">{activeCount}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Tracked</p>
              <p className="mt-1 text-2xl font-black text-foreground">{orders.length - activeCount}</p>
            </div>
          </div>
        </div>
      </section>

      {allStatuses.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("")}
            className="inline-flex min-h-[44px] items-center rounded-xl px-4 py-2 text-sm font-bold transition-colors badge-pill badge-pill-primary"
            style={{ background: !filter ? "var(--primary-light)" : "var(--bg-surface)", color: !filter ? "var(--primary)" : "var(--text-secondary)" }}
          >
            All
          </button>
          {allStatuses.map((s) => {
            const meta = STATUS_META[s] ?? { label: s, tone: "badge-cyan" };
            const active = filter === s;
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`inline-flex min-h-[44px] items-center rounded-xl px-4 py-2 text-sm font-bold transition-colors badge-pill ${meta.tone}`}
                style={{
                  background: active ? "var(--primary-light)" : "var(--bg-surface)",
                  color: active ? "var(--primary)" : "var(--text-secondary)",
                  borderColor: active ? "var(--border-accent)" : "var(--border)",
                }}
              >
                {meta.label}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="glass rounded-2xl p-8 text-sm text-muted-foreground">Loading orders…</div>
      ) : visible.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Package size={22} />
          </div>
          <p className="text-sm font-semibold text-foreground">No orders yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Place an order to start tracking settlement here.</p>
          <Link href="/marketplace" className="btn-primary mt-5 inline-flex min-h-[44px]">
            Browse marketplace
            <ArrowRight size={15} />
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {visible.map((order) => {
            const status = statusKey(order.account.status);
            const meta = STATUS_META[status] ?? { label: status, tone: "badge-cyan" };
            const amount = Number(order.account.amount?.toString() ?? 0) / 1_000_000;
            const quantity = 1; // Trades aggregate quantity into amount on-chain
            const deadline = order.account?.shipByDeadline ? Number(order.account.shipByDeadline.toString()) : null;
            const trackingHref = `/user/orders/${order.pubkey?.toBase58() ?? order.account?.tradeId ?? 'unknown'}`;

            return (
              <article key={order.pubkey?.toBase58() ?? Math.random().toString()} className="glass rounded-3xl p-5 sm:p-8 border border-white/5 shadow-2xl bg-white/[0.02]">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`badge ${meta.tone} px-3 py-1 rounded-full`}>{meta.label}</span>
                      <span className="badge badge-cyan px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                        Ref: {shortKey(order.pubkey)}
                      </span>
                    </div>
                    <h3 className="mt-4 text-xl font-black text-foreground tracking-tight">{shortKey(order.account.seller as PublicKey)}</h3>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      <span className="inline-flex items-center gap-2">
                        <Package size={14} className="text-primary" />
                        Qty {quantity}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Truck size={14} className="text-primary" />
                        zkTLS Monitoring
                      </span>
                      {deadline && (
                        <span className="inline-flex items-center gap-2">
                          <Clock3 size={14} className="text-primary" />
                          Due {new Date(deadline * 1000).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
 
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                    <div className="text-right shrink-0">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Settlement locked</p>
                      <p className="mt-1 text-2xl font-black text-foreground">${amount.toFixed(2)}</p>
                    </div>
                    <Link href={trackingHref} className="btn-enter flex items-center gap-3 min-h-[44px] px-5 py-2.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all font-black text-xs uppercase tracking-widest">
                      Live tracking
                      <BadgeCheck size={16} />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
