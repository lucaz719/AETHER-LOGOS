'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { ArrowRight, BadgeCheck, Clock3, Package, ShieldCheck, Truck } from "lucide-react";

const API = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8080";

interface Order {
  pubkey: string;
  account: {
    buyer: string;
    seller: string;
    total_amount: string | number;
    quantity?: string | number;
    status: Record<string, unknown>;
    created_at?: string;
    shipByDeadline?: string | number;
  };
}

const STATUS_META: Record<string, { label: string; tone: string }> = {
  Created: { label: "Created", tone: "badge-cyan" },
  EscrowLocked: { label: "Funds Locked", tone: "badge-amber" },
  Shipped: { label: "Shipment Active", tone: "badge-violet" },
  Delivered: { label: "Delivered", tone: "badge-green" },
  Cancelled: { label: "Cancelled", tone: "badge-red" },
};

function statusKey(status: unknown): string {
  if (!status || typeof status !== "object") return "Unknown";
  return Object.keys(status as Record<string, unknown>)[0] ?? "Unknown";
}

function shortKey(value: string): string {
  return `${value.slice(0, 6)}…${value.slice(-6)}`;
}

export default function UserOrdersPage() {
  const { publicKey } = useWallet();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");

  useEffect(() => {
    if (!publicKey) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const res = await fetch(`${API}/api/marketplace/orders?buyer=${publicKey.toBase58()}`);
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders ?? []);
        }
      } catch {
        // offline fallback stays empty
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [publicKey]);

  const allStatuses = useMemo(
    () => Array.from(new Set(orders.map((o) => statusKey(o.account.status)))).filter(Boolean),
    [orders],
  );
  const visible = filter ? orders.filter((o) => statusKey(o.account.status) === filter) : orders;
  const activeCount = orders.filter((o) => !["Delivered", "Cancelled"].includes(statusKey(o.account.status))).length;

  if (!publicKey) {
    return (
      <main style={{ textAlign: "center", paddingTop: "4rem" }}>
        <h2 style={{ color: "var(--text-primary)", marginBottom: "0.5rem" }}>My Orders</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>Connect your wallet to view your orders.</p>
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
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Orders</p>
              <p className="mt-1 text-2xl font-black text-foreground">{orders.length}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Active</p>
              <p className="mt-1 text-2xl font-black text-foreground">{activeCount}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Tracked</p>
              <p className="mt-1 text-2xl font-black text-foreground">{orders.length - activeCount}</p>
            </div>
          </div>
        </div>
      </section>

      {allStatuses.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("")}
            className="badge-pill badge-pill-primary"
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
                className={`badge-pill ${meta.tone}`}
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
          <Link href="/marketplace" className="btn-primary mt-5 inline-flex">
            Browse marketplace
            <ArrowRight size={15} />
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {visible.map((order) => {
            const status = statusKey(order.account.status);
            const meta = STATUS_META[status] ?? { label: status, tone: "badge-cyan" };
            const amount = Number(order.account.total_amount ?? 0) / 1_000_000;
            const quantity = order.account.quantity ? Number(order.account.quantity) : 1;
            const deadline = order.account.shipByDeadline ? Number(order.account.shipByDeadline) : null;
            const trackingHref = `/user/orders/${order.pubkey}`;

            return (
              <article key={order.pubkey} className="glass rounded-3xl p-8 border border-white/5 shadow-2xl bg-white/[0.02]">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`badge ${meta.tone} px-3 py-1 rounded-full`}>{meta.label}</span>
                      <span className="badge badge-cyan px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                        Ref: {shortKey(order.pubkey)}
                      </span>
                    </div>
                    <h3 className="mt-4 text-xl font-black text-foreground tracking-tight">{shortKey(order.account.seller)}</h3>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
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
 
                  <div className="flex shrink-0 items-center gap-6">
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Settlement locked</p>
                      <p className="mt-1 text-2xl font-black text-foreground">${amount.toFixed(2)}</p>
                    </div>
                    <Link href={trackingHref} className="btn-enter flex items-center gap-3 px-6 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all font-black text-xs uppercase tracking-widest">
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
