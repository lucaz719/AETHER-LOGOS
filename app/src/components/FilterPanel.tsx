'use client';

import { VendorTypeFilter } from "./VendorTypeFilter";
import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function FilterPanel({
  selectedTypes,
  onTypesChange,
}: {
  selectedTypes: string[];
  onTypesChange: (types: string[]) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const initialMin = searchParams.get("minPrice") || "";
  const initialMax = searchParams.get("maxPrice") || "";
  
  const [minPrice, setMinPrice] = useState(initialMin);
  const [maxPrice, setMaxPrice] = useState(initialMax);

  const applyPriceFilter = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (minPrice && !isNaN(Number(minPrice))) {
      params.set("minPrice", minPrice);
    } else {
      params.delete("minPrice");
    }
    
    if (maxPrice && !isNaN(Number(maxPrice))) {
      params.set("maxPrice", maxPrice);
    } else {
      params.delete("maxPrice");
    }
    
    // Reset to page 1 on new filter
    params.delete("page");
    
    router.push(`/marketplace/search?${params.toString()}`);
  }, [minPrice, maxPrice, searchParams, router]);

  const clearFilters = useCallback(() => {
    setMinPrice("");
    setMaxPrice("");
    onTypesChange([]);
    
    const params = new URLSearchParams(searchParams.toString());
    params.delete("minPrice");
    params.delete("maxPrice");
    params.delete("type");
    params.delete("page");
    router.push(`/marketplace/search?${params.toString()}`);
  }, [onTypesChange, searchParams, router]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", padding: "1.5rem", background: "var(--bg-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
      
      {/* Price Range Filter */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div style={{ fontWeight: 700, fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Price Range (USDC)
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input 
            type="number" 
            placeholder="Min" 
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="input-field" 
            style={{ width: "100%", padding: "0.5rem" }}
            aria-label="Minimum Price"
          />
          <span style={{ color: "var(--text-muted)" }}>-</span>
          <input 
            type="number" 
            placeholder="Max" 
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="input-field" 
            style={{ width: "100%", padding: "0.5rem" }}
            aria-label="Maximum Price"
          />
        </div>
        <button onClick={applyPriceFilter} className="btn-secondary" style={{ padding: "0.5rem", fontSize: "0.85rem", width: "100%" }}>
          Apply Price
        </button>
      </div>

      <hr style={{ borderColor: "var(--border)", opacity: 0.5 }} />

      <VendorTypeFilter selected={selectedTypes} onChange={onTypesChange} />
      
      <button 
        onClick={clearFilters} 
        className="btn-ghost" 
        style={{ padding: "0.5rem", fontSize: "0.85rem", color: "var(--error)" }}
      >
        Clear All Filters
      </button>
    </div>
  );
}
