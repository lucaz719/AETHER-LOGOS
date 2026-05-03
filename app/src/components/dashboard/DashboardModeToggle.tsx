import { ShoppingCart, TrendingUp } from "lucide-react";

type DashboardMode = "marketplace" | "hedge";

type DashboardModeToggleProps = {
  mode: DashboardMode;
  onChange: (mode: DashboardMode) => void;
};

export function DashboardModeToggle({ mode, onChange }: DashboardModeToggleProps) {
  const isHedge = mode === "hedge";

  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-border bg-card p-1 shadow-sm">
      <div className="relative grid grid-cols-2">
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 left-0 w-1/2 rounded-lg bg-primary transition-transform duration-300 ease-in-out ${isHedge ? "translate-x-full" : "translate-x-0"}`}
        />
        <button
          type="button"
          onClick={() => onChange("marketplace")}
          className={`relative z-10 inline-flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${!isHedge ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <ShoppingCart className="h-4 w-4" aria-hidden="true" />
          B2B Marketplace
        </button>
        <button
          type="button"
          onClick={() => onChange("hedge")}
          className={`relative z-10 inline-flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${isHedge ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <TrendingUp className="h-4 w-4" aria-hidden="true" />
          Hedge Markets
        </button>
      </div>
    </div>
  );
}
