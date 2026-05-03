type ProductCardProps = {
  productId: string;
  title: string;
  category: string;
  vendor: string;
  sellerWallet: string;
  sellerTier: "distributor" | "wholesaler" | "manufacturer";
  rating: number;
  priceUsdc: number;
  moq: number;
  leadTimeDays: number;
  usdcMint: string;
  onBuy: (payload: {
    productId: string;
    title: string;
    sellerWallet: string;
    usdcMint: string;
    tier: "distributor" | "wholesaler" | "manufacturer";
    moq: number;
    leadTimeDays: number;
  }) => void;
};

const usdc = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const trustBadge: Record<ProductCardProps["sellerTier"], string> = {
  manufacturer: "Direct Manufacturer",
  wholesaler: "Verified Wholesaler",
  distributor: "Certified Distributor",
};

const trustSubtext: Record<ProductCardProps["sellerTier"], string> = {
  manufacturer: "High Trust, Lowest Price",
  wholesaler: "Bulk Specialist",
  distributor: "Fast Local Shipping",
};

export function ProductCard({
  productId,
  title,
  category,
  vendor,
  sellerWallet,
  sellerTier,
  rating,
  priceUsdc,
  moq,
  leadTimeDays,
  usdcMint,
  onBuy,
}: ProductCardProps) {
  return (
    <article className="rounded-lg border border-border bg-card shadow-sm">
      <div
        className="aspect-[4/3] w-full rounded-t-lg border-b border-border bg-muted"
        role="img"
        aria-label={`${title} product image placeholder`}
      />
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{category}</p>
          <span className="rounded-full border border-border bg-muted px-2 py-1 text-xs font-semibold text-foreground">
            {trustBadge[sellerTier]}
          </span>
        </div>

        <h3 className="text-base font-semibold text-card-foreground">{title}</h3>

        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Price</dt>
            <dd className="font-mono text-base font-semibold tabular-nums text-card-foreground">{usdc.format(priceUsdc)} USDC</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">MOQ</dt>
            <dd className="text-card-foreground">{moq} units</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Lead Time</dt>
            <dd className="text-card-foreground">{leadTimeDays} days</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Rating</dt>
            <dd className="font-mono tabular-nums text-card-foreground">{rating.toFixed(1)} / 5.0</dd>
          </div>
        </dl>

        <p className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
          Vendor: <span className="font-semibold text-foreground">{vendor}</span>
        </p>
        <p className="rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
          {trustSubtext[sellerTier]}
        </p>

        <button
          type="button"
          onClick={() =>
            onBuy({
              productId,
              title,
              sellerWallet,
              usdcMint,
              tier: sellerTier,
              moq,
              leadTimeDays,
            })
          }
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Buy / Lock in Escrow
        </button>
      </div>
    </article>
  );
}
