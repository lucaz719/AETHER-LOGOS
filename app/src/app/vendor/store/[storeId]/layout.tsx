'use client';

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

const STORE_NAV = [
  { path: "dashboard", label: "Dashboard", icon: "⬡" },
  { path: "products", label: "Products", icon: "📦" },
  { path: "orders", label: "Orders", icon: "🧾" },
  { path: "customers", label: "Customers", icon: "👥" },
  { path: "analytics", label: "Analytics", icon: "◈" },
  { path: "promotions", label: "Promotions", icon: "🏷" },
  { path: "settings", label: "Settings", icon: "⚙" },
];

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const { storeId } = useParams<{ storeId: string }>();
  const pathname = usePathname();

  return (
    <div style={{ display: "flex", gap: "2rem", maxWidth: 1200, margin: "0 auto", padding: "2rem 1.25rem" }}>
      {/* Sidebar */}
      <nav
        className="glass"
        style={{
          width: 200,
          flexShrink: 0,
          padding: "1rem 0",
          borderRadius: "var(--radius-lg)",
          alignSelf: "start",
          position: "sticky",
          top: 80,
        }}
      >
        <div style={{ padding: "0 1rem 0.5rem", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-muted)", textTransform: "uppercase" }}>
          Store #{storeId}
        </div>
        <Link
          href="/vendor/stores"
          style={{ display: "block", padding: "0.4rem 1rem", fontSize: "0.78rem", color: "var(--text-muted)", textDecoration: "none", marginBottom: "0.25rem" }}
        >
          ← All Stores
        </Link>
        <div style={{ borderTop: "1px solid var(--border)", marginBottom: "0.5rem" }} />
        {STORE_NAV.map((nav) => {
          const href = `/vendor/store/${storeId}/${nav.path}`;
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={nav.path}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                padding: "0.55rem 1rem",
                fontSize: "0.875rem",
                fontWeight: active ? 600 : 400,
                color: active ? "var(--cyan)" : "var(--text-secondary)",
                textDecoration: "none",
                background: active ? "var(--cyan-dim)" : "transparent",
                borderLeft: active ? "2px solid var(--cyan)" : "2px solid transparent",
                transition: "all var(--transition)",
              }}
            >
              <span style={{ fontSize: "0.9rem" }}>{nav.icon}</span>
              {nav.label}
            </Link>
          );
        })}
      </nav>
      {/* Main */}
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}
