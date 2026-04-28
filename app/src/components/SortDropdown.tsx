'use client';

import { useRouter, useSearchParams } from "next/navigation";

export function SortDropdown() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") || "newest";

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sortValue = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    
    if (sortValue === "newest") {
      params.delete("sort");
    } else {
      params.set("sort", sortValue);
    }
    
    router.push(`/marketplace/search?${params.toString()}`);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <label htmlFor="sort-dropdown" style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500 }}>
        Sort by:
      </label>
      <select
        id="sort-dropdown"
        value={currentSort}
        onChange={handleSortChange}
        className="input-field"
        style={{ padding: "0.4rem 2rem 0.4rem 0.75rem", fontSize: "0.85rem", cursor: "pointer", minWidth: "140px" }}
      >
        <option value="newest">Newest (Default)</option>
        <option value="price_asc">Price: Low to High</option>
        <option value="price_desc">Price: High to Low</option>
      </select>
    </div>
  );
}
