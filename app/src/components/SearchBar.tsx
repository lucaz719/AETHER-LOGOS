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
          🔍
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products, vendors…"
          className="input"
          style={{ paddingLeft: "2.4rem" }}
          aria-label="Search marketplace"
        />
      </div>
      <button type="submit" className="btn-primary" aria-label="Submit search">
        Search
      </button>
    </form>
  );
}

