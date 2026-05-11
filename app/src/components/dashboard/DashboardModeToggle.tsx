import { ShoppingCart, TrendingUp } from "lucide-react";

type DashboardMode = "marketplace" | "hedge";

type DashboardModeToggleProps = {
  mode: DashboardMode;
  onChange: (mode: DashboardMode) => void;
};

export function DashboardModeToggle({ mode, onChange }: DashboardModeToggleProps) {
  return (
    // Uses CSS tokens → theme-aware automatically in both light and dark
    <div className="w-full max-w-full rounded-xl border border-border bg-secondary p-1 shadow-inner backdrop-blur-md sm:min-w-[320px]">
      <div className="relative flex items-center">
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 left-0 w-1/2 rounded-lg transition-all duration-300 ease-out ${
            mode === "hedge" 
              ? "translate-x-full bg-purple-600 shadow-lg shadow-purple-500/20" 
              : "translate-x-0 bg-indigo-600 shadow-lg shadow-indigo-500/20"
          }`}
        />
        <button
          type="button"
          onClick={() => onChange("marketplace")}
          className={`relative z-10 inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-2 text-xs font-bold transition-all duration-200 sm:text-[13px] ${
            mode === "marketplace"
              ? "text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShoppingCart className="h-4 w-4" aria-hidden="true" />
          Procurement
        </button>
        <button
          type="button"
          onClick={() => onChange("hedge")}
          className={`relative z-10 inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-2 text-xs font-bold transition-all duration-200 sm:text-[13px] ${
            mode === "hedge"
              ? "text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <TrendingUp className="h-4 w-4" aria-hidden="true" />
          Risk Desk
        </button>
      </div>
    </div>
  );
}
