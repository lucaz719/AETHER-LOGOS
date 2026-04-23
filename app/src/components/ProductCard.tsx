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
        className="glass"
        style={{
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          opacity: isActive ? 1 : 0.45,
          cursor: isActive ? "pointer" : "default",
          transition: "box-shadow var(--transition), border-color var(--transition), transform var(--transition)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--glow-cyan), var(--shadow-card)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "";
        }}
      >
        {/* Image */}
        {imgUrl ? (
          <img src={imgUrl} alt={title} style={{ width: "100%", height: 160, objectFit: "cover" }} />
        ) : (
          <div
            style={{
              width: "100%",
              height: 160,
              background: "linear-gradient(135deg, rgba(0,212,255,0.06), rgba(124,58,237,0.08))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              fontSize: "2.5rem",
            }}
          >
            📦
          </div>
        )}

        {/* Body */}
        <div style={{ padding: "0.85rem", display: "grid", gap: "0.35rem" }}>
          <span className="badge badge-violet" style={{ alignSelf: "flex-start" }}>{category}</span>
          <div
            style={{
              fontWeight: 600,
              fontSize: "0.9rem",
              lineHeight: 1.35,
              color: "var(--text-primary)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--cyan)" }}>
            ${priceLabel} <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 400 }}>USDC</span>
          </div>
          {minOrderQty > 1 && (
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              MOQ: {minOrderQty} units
            </div>
          )}
          {vendorName && (
            <Link
              href={`/marketplace/vendor/${vendorAuthority}`}
              onClick={(e) => e.stopPropagation()}
              style={{ fontSize: "0.72rem", color: "var(--text-muted)", textDecoration: "none" }}
            >
              by {vendorName}
            </Link>
          )}
        </div>
      </div>
    </Link>
  );
}

