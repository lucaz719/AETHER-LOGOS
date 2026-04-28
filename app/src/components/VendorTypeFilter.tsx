'use client';

import { useCallback } from "react";

const VENDOR_TYPES = ["Retailer", "Wholesaler", "Distributor", "Manufacturer"] as const;
const TYPE_ICONS: Record<string, string> = {
  Retailer: "🛍️",
  Wholesaler: "📦",
  Distributor: "🚢",
  Manufacturer: "🏭",
};

export function VendorTypeFilter({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (types: string[]) => void;
}) {
  const toggle = useCallback(
    (type: string) => {
      onChange(
        selected.includes(type)
          ? selected.filter((t) => t !== type)
          : [...selected, type],
      );
    },
    [selected, onChange],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <div style={{ fontWeight: 700, fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.15rem" }}>
        Vendor Type
      </div>
      {VENDOR_TYPES.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => toggle(t)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.45rem 0.7rem",
            borderRadius: "var(--radius-sm)",
            border: selected.includes(t) ? "1px solid var(--cyan)" : "1px solid var(--border)",
            background: selected.includes(t) ? "var(--cyan-dim)" : "transparent",
            color: selected.includes(t) ? "var(--cyan)" : "var(--text-secondary)",
            fontSize: "0.85rem",
            cursor: "pointer",
            textAlign: "left",
            transition: "all var(--transition)",
          }}
        >
          <span>{TYPE_ICONS[t] ?? ""}</span>
          {t}
          {selected.includes(t) && (
            <span style={{ marginLeft: "auto", fontSize: "0.7rem" }}>✓</span>
          )}
        </button>
      ))}
    </div>
  );
}

