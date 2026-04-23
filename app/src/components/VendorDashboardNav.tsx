import Link from "next/link";

const NAV_ITEMS = [
  { href: "/vendor/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/vendor/listings", label: "My Listings", icon: "📋" },
  { href: "/vendor/listings/new", label: "New Listing", icon: "+" },
  { href: "/vendor/orders", label: "Orders", icon: "📦" },
  { href: "/vendor/register", label: "Shop Profile", icon: "🏪" },
];

export function VendorDashboardNav({ active }: { active: string }) {
  return (
    <nav
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.2rem",
        minWidth: 190,
        borderRight: "1px solid var(--border)",
        paddingRight: "1rem",
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = active === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              padding: "0.6rem 0.8rem",
              borderRadius: "var(--radius-sm)",
              textDecoration: "none",
              fontSize: "0.88rem",
              background: isActive ? "var(--violet-dim)" : "transparent",
              color: isActive ? "#a78bfa" : "var(--text-secondary)",
              fontWeight: isActive ? 600 : 400,
              borderLeft: isActive ? "2px solid var(--violet)" : "2px solid transparent",
              transition: "all var(--transition)",
            }}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

