import Link from "next/link";

const NAV_ITEMS = [
  { href: "/vendor/dashboard", label: "Dashboard", icon: "📊" },
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
        gap: "0.25rem",
        minWidth: 180,
        borderRight: "1px solid #e2e8f0",
        paddingRight: "1rem",
      }}
    >
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.6rem 0.8rem",
            borderRadius: 8,
            textDecoration: "none",
            fontSize: "0.9rem",
            background: active === item.href ? "#f1f5f9" : "transparent",
            color: active === item.href ? "#1e293b" : "#475569",
            fontWeight: active === item.href ? 600 : 400,
          }}
        >
          <span>{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
