import Link from "next/link";

const VENDOR_TYPE_COLORS: Record<string, string> = {
  Retailer: "#2563eb",
  Wholesaler: "#7c3aed",
  Distributor: "#0891b2",
  Manufacturer: "#b45309",
};

function StarRating({ sum, count }: { sum: number; count: number }) {
  const avg = count > 0 ? (sum / count).toFixed(1) : "—";
  return (
    <span style={{ color: "#f59e0b" }}>
      {"★".repeat(Math.round(count > 0 ? sum / count : 0))}
      {"☆".repeat(5 - Math.round(count > 0 ? sum / count : 0))}
      <small style={{ color: "#6b7280", marginLeft: "0.25rem" }}>{avg} ({count})</small>
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
  const typeColor = VENDOR_TYPE_COLORS[vendorType] ?? "#475569";
  return (
    <Link href={`/marketplace/vendor/${authority}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "1rem",
          display: "grid",
          gap: "0.5rem",
          cursor: "pointer",
          transition: "box-shadow 0.2s",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong style={{ fontSize: "1rem" }}>{shopName}</strong>
          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
            {isVerified && (
              <span
                style={{
                  background: "#16a34a",
                  color: "#fff",
                  borderRadius: 9999,
                  padding: "0.1rem 0.5rem",
                  fontSize: "0.65rem",
                }}
              >
                ✓ Verified
              </span>
            )}
            <span
              style={{
                background: typeColor,
                color: "#fff",
                borderRadius: 9999,
                padding: "0.1rem 0.5rem",
                fontSize: "0.7rem",
              }}
            >
              {vendorType}
            </span>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {shopDescription}
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
          <StarRating sum={ratingSum} count={ratingCount} />
          <span style={{ color: "#64748b" }}>
            {(totalSales / 1_000_000).toFixed(2)} USDC sold
          </span>
        </div>
      </div>
    </Link>
  );
}
