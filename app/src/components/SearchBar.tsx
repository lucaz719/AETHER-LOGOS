'use client';

import { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export function SearchBar({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();

  const submit = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const q = query.trim();
      if (q) router.push(`/marketplace/search?q=${encodeURIComponent(q)}`);
      else router.push("/marketplace");
    },
    [query, router],
  );

  // Debounced auto-search (optional, disabled by default for cleaner UX, but clear button added)
  // If we wanted auto-search:
  // useEffect(() => {
  //   const t = setTimeout(() => submit(), 500);
  //   return () => clearTimeout(t);
  // }, [query, submit]);

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: "0.5rem", width: "100%" }}>
      <div style={{ position: "relative", flex: 1 }}>
        <span
          style={{
            position: "absolute",
            left: "0.75rem",
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-muted)",
            fontSize: "0.9rem",
            pointerEvents: "none",
          }}
        >
          Search
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products, vendors…"
          className="input"
          style={{ paddingLeft: "2.4rem", paddingRight: query ? "2.4rem" : "1rem" }}
          aria-label="Search marketplace"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); setTimeout(() => router.push("/marketplace"), 0); }}
            style={{
              position: "absolute",
              right: "0.5rem",
              top: "50%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "0.25rem",
              fontSize: "0.9rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>
      <button type="submit" className="btn-primary" aria-label="Submit search">
        Search
      </button>
    </form>
  );
}
