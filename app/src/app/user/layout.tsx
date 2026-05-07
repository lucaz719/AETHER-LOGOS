'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Wallet, Star, UserCircle, Settings } from "lucide-react";

const USER_NAV = [
  { href: "/user/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/user/orders", label: "Orders", icon: Package },
  { href: "/user/wallet", label: "Wallet", icon: Wallet },
  { href: "/user/reviews", label: "Reviews", icon: Star },
  { href: "/user/profile", label: "Profile", icon: UserCircle },
  { href: "/user/settings", label: "Settings", icon: Settings },
];

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  return (
    <div style={{ display: "flex", gap: "2rem", maxWidth: 1200, margin: "0 auto", padding: "2rem 1.25rem" }}>
      {/* Sidebar */}
      <nav
        style={{
          width: 224,
          flexShrink: 0,
          background: "#0f1117",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "var(--radius-lg)",
          display: "flex",
          flexDirection: "column",
          paddingTop: "1.5rem",
          paddingBottom: "1.5rem",
          paddingLeft: "0.75rem",
          paddingRight: "0.75rem",
          gap: "0.25rem",
          minHeight: "100vh",
          alignSelf: "start",
          position: "sticky",
          top: 80,
        }}
      >
        <div style={{ padding: "0 0.75rem 0.5rem", fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.12em", color: "#4B5563", textTransform: "uppercase" }}>
          My Account
        </div>
        {USER_NAV.map((link) => {
          const active = pathname === link.href || pathname.startsWith(link.href + "/");
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.5rem 0.75rem",
                fontSize: "0.8125rem",
                fontWeight: 500,
                color: active ? "#60A5FA" : "#9CA3AF",
                textDecoration: "none",
                background: active ? "rgba(96,165,250,0.15)" : "transparent",
                borderLeft: active ? "2px solid #3B82F6" : "2px solid transparent",
                borderRadius: "0.5rem",
                transition: "all 150ms ease",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = "rgba(255,255,255,0.05)";
                  el.style.color = "white";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = "transparent";
                  el.style.color = "#9CA3AF";
                }
              }}
            >
              <Icon size={16} />
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
