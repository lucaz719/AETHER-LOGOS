import Link from "next/link";

export function ProductCard({
  pubkey,
  title,
  priceUsdc,
  minOrderQty,
  vendorName,
  vendorAuthority,
  category,
  imagesCid,
  isActive,
}: {
  pubkey: string;
  title: string;
  priceUsdc: number;
  minOrderQty: number;
  vendorName?: string;
  vendorAuthority: string;
  category: string;
  imagesCid?: string;
  isActive: boolean;
}) {
  const priceLabel = (priceUsdc / 1_000_000).toFixed(2);
  const imgUrl = imagesCid
    ? `https://gateway.pinata.cloud/ipfs/${imagesCid}`
    : null;

  return (
    <Link href={`/marketplace/listing/${pubkey}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          opacity: isActive ? 1 : 0.5,
          cursor: isActive ? "pointer" : "default",
        }}
      >
        {imgUrl ? (
          <img src={imgUrl} alt={title} style={{ width: "100%", height: 160, objectFit: "cover" }} />
        ) : (
          <div
            style={{
              width: "100%",
              height: 160,
              background: "#f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#94a3b8",
              fontSize: "2rem",
            }}
          >
            📦
          </div>
        )}
        <div style={{ padding: "0.75rem", display: "grid", gap: "0.3rem" }}>
          <div style={{ fontSize: "0.7rem", color: "#7c3aed", fontWeight: 600 }}>{category}</div>
          <div style={{ fontWeight: 600, fontSize: "0.95rem", lineHeight: 1.3 }}>{title}</div>
          <div style={{ fontSize: "0.85rem", color: "#2563eb", fontWeight: 700 }}>
            ${priceLabel} USDC
          </div>
          {minOrderQty > 1 && (
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
              MOQ: {minOrderQty} units
            </div>
          )}
          {vendorName && (
            <Link
              href={`/marketplace/vendor/${vendorAuthority}`}
              onClick={(e) => e.stopPropagation()}
              style={{ fontSize: "0.75rem", color: "#64748b", textDecoration: "none" }}
            >
              by {vendorName}
            </Link>
          )}
        </div>
      </div>
    </Link>
  );
}
