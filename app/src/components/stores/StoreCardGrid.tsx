'use client';

import { Heart, ShieldCheck, Star } from "lucide-react";

export type StoreCardItem = {
  id: string;
  storeId: string;
  walletAddr: string;
  source: "api" | "mock";
  shopName: string;
  shopDescription: string;
  vendorType: "Manufacturer" | "Wholesaler" | "Distributor";
  isVerified: boolean;
  location: string;
  memberSince: string;
  ratingAvg: number;
  onTimeDelivery: number;
  repeatBuyers: number;
  categories: string[];
};

type StoreCardGridProps = {
  stores: StoreCardItem[];
  followedStoreIds: string[];
  onToggleFollow: (storeId: string) => void;
  onEnterStore: (store: StoreCardItem) => void;
};

const VENDOR_TYPE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  Manufacturer: { bg: "rgba(249,115,22,0.12)", color: "#fb923c", border: "rgba(249,115,22,0.3)" },
  Wholesaler: { bg: "rgba(168,85,247,0.12)", color: "#a78bfa", border: "rgba(168,85,247,0.3)" },
  Distributor: { bg: "rgba(6,182,212,0.12)", color: "#22d3ee", border: "rgba(6,182,212,0.3)" },
};

function initialsAvatar(name: string, size = 36) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const hue = name.charCodeAt(0) % 360;
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "var(--radius-sm)",
        background: `hsl(${hue},50%,18%)`,
        border: `1px solid hsl(${hue},50%,30%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: size * 0.34,
        color: `hsl(${hue},60%,70%)`,
        flexShrink: 0,
      }}
    >
      {initials || "?"}
    </div>
  );
}

function StoreCard({
  store,
  isFollowed,
  onToggleFollow,
  onEnterStore,
}: {
  store: StoreCardItem;
  isFollowed: boolean;
  onToggleFollow: (storeId: string) => void;
  onEnterStore: (store: StoreCardItem) => void;
}) {
  const typeStyle = VENDOR_TYPE_COLORS[store.vendorType] || VENDOR_TYPE_COLORS.Wholesaler;

  return (
    <article className="group glass relative flex flex-col overflow-hidden transition-all duration-500 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5">
      <div className="h-24 w-full bg-gradient-to-br from-secondary/50 via-background to-secondary/30 relative">
        <div className="absolute top-4 right-4">
          <span
            className="badge font-black uppercase tracking-widest text-[9px]"
            style={{
              background: typeStyle.bg,
              color: typeStyle.color,
              border: `1px solid ${typeStyle.border}`,
              padding: "4px 10px",
            }}
          >
            {store.vendorType}
          </span>
        </div>
      </div>

      <div className="px-6 pb-6 -mt-10 relative z-10 flex flex-col flex-1">
        <div className="flex items-end gap-4 mb-5">
          <div className="shrink-0 border-4 border-background rounded-2xl shadow-lg">
            {initialsAvatar(store.shopName, 64)}
          </div>
          <div className="pb-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-black text-foreground tracking-tight truncate">{store.shopName}</h3>
              {store.isVerified && <ShieldCheck size={16} className="text-green-500 shrink-0" />}
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {store.location} · EST. {store.memberSince}
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-6 min-h-[40px]">{store.shopDescription}</p>

        <div className="flex flex-wrap gap-1.5 mb-6">
          {store.categories.slice(0, 3).map((category) => (
            <span
              key={category}
              className="px-2.5 py-1 rounded-lg bg-secondary/50 border border-border text-[10px] font-bold text-foreground uppercase tracking-tighter"
            >
              {category}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 rounded-2xl bg-secondary/30 p-3 border border-border/50 mb-6">
          <div className="text-center">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Rating</p>
            <div className="flex items-center justify-center gap-1 text-sm font-black text-foreground">
              <Star size={12} className="text-amber-500 fill-amber-500" />
              {store.ratingAvg.toFixed(1)}
            </div>
          </div>
          <div className="text-center border-x border-border/50">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Delivery</p>
            <div className="text-sm font-black text-foreground">{store.onTimeDelivery}%</div>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Repeat</p>
            <div className="text-sm font-black text-foreground">{store.repeatBuyers}%</div>
          </div>
        </div>

        <div className="mt-auto flex gap-2">
          <button
            type="button"
            className="flex-1 bg-foreground text-background py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:bg-primary hover:shadow-lg active:scale-95"
            onClick={() => onEnterStore(store)}
          >
            Enter Store
          </button>
          <button
            type="button"
            onClick={() => onToggleFollow(store.storeId)}
            className={`px-4 rounded-xl border-2 transition-all active:scale-95 flex items-center justify-center ${isFollowed
              ? "bg-primary/10 border-primary/20 text-primary"
              : "bg-transparent border-foreground text-foreground hover:bg-foreground hover:text-background"
              }`}
          >
            <Heart size={16} fill={isFollowed ? "currentColor" : "none"} />
          </button>
        </div>
      </div>
    </article>
  );
}

export function StoreCardGrid({
  stores,
  followedStoreIds,
  onToggleFollow,
  onEnterStore,
}: StoreCardGridProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" style={{ gridAutoFlow: stores.length < 3 ? "dense" : "row", justifyItems: stores.length < 3 ? "start" : "auto" }}>
      {stores.map((store) => (
        <StoreCard
          key={store.id}
          store={store}
          isFollowed={followedStoreIds.includes(store.storeId)}
          onToggleFollow={onToggleFollow}
          onEnterStore={onEnterStore}
        />
      ))}
    </div>
  );
}
