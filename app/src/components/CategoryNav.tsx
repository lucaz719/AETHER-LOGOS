'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

const CATEGORIES = [
  { slug: "electronics", label: "Electronics", icon: "⚡" },
  { slug: "apparel", label: "Apparel", icon: "👗" },
  { slug: "home-goods", label: "Home Goods", icon: "🏠" },
  { slug: "machinery", label: "Machinery", icon: "⚙️" },
  { slug: "food-beverage", label: "Food & Beverage", icon: "🍎" },
  { slug: "chemicals", label: "Chemicals", icon: "🧪" },
  { slug: "automotive", label: "Automotive", icon: "🚗" },
  { slug: "healthcare", label: "Healthcare", icon: "🏥" },
  { slug: "construction", label: "Construction", icon: "🏗️" },
  { slug: "other", label: "Other", icon: "📦" },
];

export function CategoryNav({ active }: { active?: string }) {
  const pathname = usePathname();
  return (
    <div
      style={{
        display: "flex",
        gap: "0.4rem",
        overflowX: "auto",
        paddingBottom: "0.25rem",
        scrollbarWidth: "none",
      }}
    >
      <Link
        href="/marketplace"
        style={{
          flexShrink: 0,
          padding: "0.35rem 0.85rem",
          borderRadius: "var(--radius-pill)",
          border: !active ? "1px solid var(--cyan)" : "1px solid var(--border)",
          background: !active ? "var(--cyan-dim)" : "transparent",
          color: !active ? "var(--cyan)" : "var(--text-secondary)",
          textDecoration: "none",
          fontSize: "0.82rem",
          fontWeight: !active ? 600 : 400,
          whiteSpace: "nowrap",
          transition: "border-color var(--transition), color var(--transition), background var(--transition)",
        }}
      >
        All
      </Link>
      {CATEGORIES.map((cat) => (
        <Link
          key={cat.slug}
          href={`/marketplace/category/${cat.slug}`}
          style={{
            flexShrink: 0,
            padding: "0.35rem 0.85rem",
            borderRadius: "var(--radius-pill)",
            border: active === cat.slug ? "1px solid var(--cyan)" : "1px solid var(--border)",
            background: active === cat.slug ? "var(--cyan-dim)" : "transparent",
            color: active === cat.slug ? "var(--cyan)" : "var(--text-secondary)",
            textDecoration: "none",
            fontSize: "0.82rem",
            fontWeight: active === cat.slug ? 600 : 400,
            whiteSpace: "nowrap",
            transition: "border-color var(--transition), color var(--transition), background var(--transition)",
          }}
        >
          {cat.icon} {cat.label}
        </Link>
      ))}
    </div>
  );
}

