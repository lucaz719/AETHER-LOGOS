'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useCart } from "@/hooks/useCart";
import { CartDrawer } from "@/components/CartDrawer";
import { SearchBar } from "@/components/SearchBar";

const NAV_LINKS = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/vendor/dashboard", label: "Vendor" },
  { href: "/dashboard/buyer", label: "Buyer" },
  { href: "/dashboard/seller", label: "Seller" },
  { href: "/trades", label: "Trades" },
  { href: "/markets", label: "Markets" },
];

export function NavBar() {
  const pathname = usePathname();
  const { items } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme") || "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          borderBottom: "1px solid var(--border)",
          background: "rgba(10, 15, 26, 0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          height: 60,
        }}
      >
        <nav
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 1.25rem",
            height: "100%",
            display: "flex",
            alignItems: "center",
            gap: "1.5rem",
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            style={{
              fontWeight: 800,
              fontSize: "1rem",
              letterSpacing: "0.06em",
              color: "var(--cyan)",
              textShadow: "0 0 12px rgba(0,212,255,0.45)",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            ⬡ AETHER-LOGOS
          </Link>

          {/* Nav links */}
          <div style={{ display: "flex", gap: "0.25rem", flex: 1 }}>
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    padding: "0.35rem 0.75rem",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.85rem",
                    fontWeight: active ? 600 : 400,
                    color: active ? "var(--cyan)" : "var(--text-secondary)",
                    textDecoration: "none",
                    borderBottom: active ? "2px solid var(--cyan)" : "2px solid transparent",
                    transition: "color var(--transition), border-color var(--transition)",
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* SearchBar */}
          <div style={{ flex: 1, maxWidth: 350, display: "none", '@media (min-width: 768px)': { display: 'block' } } as any}>
            <SearchBar />
          </div>

          {/* Right: Theme Toggle + Cart + Wallet */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              aria-label="Toggle theme"
              onClick={toggleTheme}
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                width: 38,
                height: 38,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--text-secondary)",
                fontSize: "1.1rem",
                transition: "border-color var(--transition)",
              }}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button
              aria-label={`Shopping cart, ${items.length} items`}
              onClick={() => setCartOpen(true)}
              style={{
                position: "relative",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                width: 38,
                height: 38,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--text-secondary)",
                fontSize: "1rem",
                transition: "border-color var(--transition)",
              }}
            >
              🛒
              {items.length > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    background: "var(--cyan)",
                    color: "var(--text-inverse)",
                    borderRadius: "var(--radius-pill)",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    minWidth: 18,
                    height: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 4px",
                  }}
                >
                  {items.length}
                </span>
              )}
            </button>

            <WalletMultiButton />
          </div>
        </nav>
      </header>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
