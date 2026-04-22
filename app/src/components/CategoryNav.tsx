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
        gap: "0.5rem",
        overflowX: "auto",
        paddingBottom: "0.25rem",
        scrollbarWidth: "none",
      }}
    >
      <Link
        href="/marketplace"
        style={{
          flexShrink: 0,
          padding: "0.4rem 0.9rem",
          borderRadius: 9999,
          border: "1px solid #e2e8f0",
          textDecoration: "none",
          fontSize: "0.85rem",
          background: !active ? "#1e293b" : "#fff",
          color: !active ? "#fff" : "#334155",
          whiteSpace: "nowrap",
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
            padding: "0.4rem 0.9rem",
            borderRadius: 9999,
            border: "1px solid #e2e8f0",
            textDecoration: "none",
            fontSize: "0.85rem",
            background: active === cat.slug ? "#1e293b" : "#fff",
            color: active === cat.slug ? "#fff" : "#334155",
            whiteSpace: "nowrap",
          }}
        >
          {cat.icon} {cat.label}
        </Link>
      ))}
    </div>
  );
}
