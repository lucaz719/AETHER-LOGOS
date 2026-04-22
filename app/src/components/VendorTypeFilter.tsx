'use client';

import { useCallback, useState } from "react";

const VENDOR_TYPES = ["Retailer", "Wholesaler", "Distributor", "Manufacturer"] as const;

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
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <strong style={{ fontSize: "0.85rem" }}>Vendor Type</strong>
      {VENDOR_TYPES.map((t) => (
        <label key={t} style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.85rem" }}>
          <input
            type="checkbox"
            checked={selected.includes(t)}
            onChange={() => toggle(t)}
          />
          {t}
        </label>
      ))}
    </div>
  );
}
