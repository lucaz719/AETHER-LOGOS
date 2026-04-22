'use client';

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

export function SearchBar({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();

  const submit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = query.trim();
      if (q) router.push(`/marketplace/search?q=${encodeURIComponent(q)}`);
      else router.push("/marketplace");
    },
    [query, router],
  );

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: "0.5rem", width: "100%" }}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products, vendors…"
        style={{
          flex: 1,
          padding: "0.6rem 1rem",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          fontSize: "0.9rem",
          outline: "none",
        }}
      />
      <button
        type="submit"
        style={{
          padding: "0.6rem 1.2rem",
          background: "#1e293b",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
          fontSize: "0.9rem",
        }}
      >
        Search
      </button>
    </form>
  );
}
