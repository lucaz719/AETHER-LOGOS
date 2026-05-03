import { ShoppingCart, TrendingUp } from "lucide-react";

type DashboardMode = "marketplace" | "hedge";

type DashboardModeToggleProps = {
  mode: DashboardMode;
  onChange: (mode: DashboardMode) => void;
};

export function DashboardModeToggle({ mode, onChange }: DashboardModeToggleProps) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100/80 dark:bg-white/5 backdrop-blur-md p-1.5 shadow-inner min-w-[320px]">
      <div className="relative flex items-center">
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 left-0 w-1/2 rounded-lg transition-all duration-300 ease-out ${
            mode === "hedge" 
              ? "translate-x-full bg-purple-600 shadow-purple-500/20" 
              : "translate-x-0 bg-indigo-600 shadow-indigo-500/20"
          } shadow-lg`}
        />
        <button
          type="button"
          onClick={() => onChange("marketplace")}
          className={`relative z-10 flex-1 inline-flex h-10 items-center justify-center gap-2 rounded-lg text-[13px] font-bold transition-all duration-200 ${
            mode === "marketplace"
              ? "text-white"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <ShoppingCart className="h-4 w-4" aria-hidden="true" />
          Procurement
        </button>
        <button
          type="button"
          onClick={() => onChange("hedge")}
          className={`relative z-10 flex-1 inline-flex h-10 items-center justify-center gap-2 rounded-lg text-[13px] font-bold transition-all duration-200 ${
            mode === "hedge"
              ? "text-white"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <TrendingUp className="h-4 w-4" aria-hidden="true" />
          Risk Desk
        </button>
      </div>
    </div>
  );
}
