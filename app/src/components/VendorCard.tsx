import Link from "next/link";

const VENDOR_TYPE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  Retailer:     { bg: "rgba(0,212,255,0.1)",   color: "#00d4ff", border: "rgba(0,212,255,0.25)" },
  Wholesaler:   { bg: "rgba(124,58,237,0.12)", color: "#a78bfa", border: "rgba(124,58,237,0.3)" },
  Distributor:  { bg: "rgba(8,145,178,0.12)",  color: "#22d3ee", border: "rgba(8,145,178,0.3)"  },
  Manufacturer: { bg: "rgba(180,83,9,0.12)",   color: "#fb923c", border: "rgba(180,83,9,0.3)"   },
};

function StarRating({ sum, count }: { sum: number; count: number }) {
  const avg = count > 0 ? sum / count : 0;
  const avgLabel = count > 0 ? avg.toFixed(1) : "—";
  const rounded = Math.round(avg);
  return (
    <span style={{ color: "var(--amber)", fontSize: "0.8rem" }}>
      {"★".repeat(rounded)}
      {"☆".repeat(5 - rounded)}
      <small style={{ color: "var(--text-muted)", marginLeft: "0.3rem" }}>{avgLabel} ({count})</small>
    </span>
  );
}

export function VendorCard({
  authority,
  shopName,
  shopDescription,
  vendorType,
  isVerified,
  ratingSum,
  ratingCount,
  totalSales,
}: {
  authority: string;
  shopName: string;
  shopDescription: string;
  vendorType: string;
  isVerified: boolean;
  ratingSum: number;
  ratingCount: number;
  totalSales: number;
}) {
  const typeStyle = VENDOR_TYPE_COLORS[vendorType] ?? { bg: "rgba(255,255,255,0.05)", color: "var(--text-secondary)", border: "var(--border)" };
  return (
    <Link href={`/marketplace/vendor/${authority}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div
        className="glass"
        style={{
          padding: "1rem",
          display: "grid",
          gap: "0.5rem",
          cursor: "pointer",
          transition: "box-shadow var(--transition), border-color var(--transition), transform var(--transition)",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.transform = "translateY(-2px)";
          el.style.boxShadow = "var(--shadow-card)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.transform = "translateY(0)";
          el.style.boxShadow = "";
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)" }}>{shopName}</strong>
          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
            {isVerified && (
              <span className="badge badge-green">✓ Verified</span>
            )}
            <span
              className="badge"
              style={{ background: typeStyle.bg, color: typeStyle.color, border: `1px solid ${typeStyle.border}` }}
            >
              {vendorType}
            </span>
          </div>
        </div>
        <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {shopDescription}
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
          <StarRating sum={ratingSum} count={ratingCount} />
          <span style={{ color: "var(--text-muted)" }}>
            {(totalSales / 1_000_000).toFixed(2)} USDC sold
          </span>
        </div>
      </div>
    </Link>
  );
}

