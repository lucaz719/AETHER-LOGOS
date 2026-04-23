export function Skeleton({ width, height, style }: { width?: string | number; height?: string | number; style?: React.CSSProperties }) {
  return (
    <div
      className="skeleton"
      style={{ width: width ?? "100%", height: height ?? "1rem", borderRadius: "var(--radius-sm)", ...style }}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="glass" style={{ overflow: "hidden" }}>
      <Skeleton height={160} style={{ borderRadius: 0 }} />
      <div style={{ padding: "0.85rem", display: "grid", gap: "0.5rem" }}>
        <Skeleton width="40%" height={18} />
        <Skeleton height={16} />
        <Skeleton width="60%" height={20} />
      </div>
    </div>
  );
}

export function VendorCardSkeleton() {
  return (
    <div className="glass" style={{ padding: "1rem", display: "grid", gap: "0.6rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Skeleton width="50%" height={18} />
        <Skeleton width={60} height={18} />
      </div>
      <Skeleton height={14} />
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Skeleton width="40%" height={14} />
        <Skeleton width="30%" height={14} />
      </div>
    </div>
  );
}
