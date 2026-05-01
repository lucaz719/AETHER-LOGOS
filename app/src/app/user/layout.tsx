'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

const USER_NAV = [
  { href: "/user/dashboard", label: "Dashboard", icon: "⬡" },
  { href: "/user/orders", label: "Orders", icon: "📦" },
  { href: "/user/wallet", label: "Wallet", icon: "◈" },
  { href: "/user/reviews", label: "Reviews", icon: "★" },
  { href: "/user/profile", label: "Profile", icon: "◉" },
  { href: "/user/settings", label: "Settings", icon: "⚙" },
];

export default function UserLayout({ children }: { children: React.ReactNode }) {
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
        <div style={{ padding: "0 1rem 0.75rem", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-muted)", textTransform: "uppercase" }}>
          My Account
        </div>
        {USER_NAV.map((link) => {
          const active = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
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
              <span style={{ fontSize: "0.95rem" }}>{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>
      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}
