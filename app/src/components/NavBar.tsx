'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// Lazy-load WalletMultiButton so the heavy Solana adapter chunk is only
// fetched after the page hydrates, not during the initial HTML parse.
const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => ({ default: m.WalletMultiButton })),
  { ssr: false, loading: () => null }
);

const NAV_LINKS = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/vendor/stores", label: "Stores" },
  { href: "/user/dashboard", label: "My Account" },
  { href: "/trades", label: "Trades" },
  { href: "/markets", label: "Markets" },
];

export function NavBar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    setIsDark(saved !== "light");
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.style.backgroundColor = "#0a0a0f";
      document.documentElement.style.color = "#ffffff";
      document.body.style.backgroundColor = "#0a0a0f";
    } else {
      document.documentElement.style.backgroundColor = "#ffffff";
      document.documentElement.style.color = "#000000";
      document.body.style.backgroundColor = "#ffffff";
    }
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  return (
    <>
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          borderBottom: "1px solid rgba(99, 102, 241, 0.3)",
          background: "#0d0d14",
          height: 64,
        }}
      >
        <nav
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "0 1.5rem",
            height: "100%",
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <Link
            href="/"
            style={{
              fontWeight: 700,
              fontSize: "0.95rem",
              letterSpacing: "0.08em",
              color: "var(--cyan)",
              textDecoration: "none",
              justifySelf: "start",
              flexShrink: 0,
            }}
          >
            ◯ AETHER-LOGOS
          </Link>

          <div style={{ display: "flex", gap: "0.4rem", justifySelf: "center", alignItems: "center" }}>
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={active ? "text-white" : "text-gray-300 hover:text-purple-400"}
                  style={{
                    padding: "0.4rem 0.7rem",
                    borderRadius: 6,
                    fontSize: "0.84rem",
                    fontWeight: active ? 600 : 500,
                    textDecoration: "none",
                    border: active ? "1px solid rgba(255,255,255,0.14)" : "1px solid transparent",
                    background: active ? "rgba(255,255,255,0.04)" : "transparent",
                    transition: "all var(--transition)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", justifySelf: "end" }}>
            {mounted && <WalletMultiButton />}
            <button
              aria-label="Toggle theme"
              onClick={() => setIsDark((prev) => !prev)}
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: 6,
                width: 34,
                height: 34,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--text-secondary)",
                fontSize: "0.95rem",
                transition: "border-color var(--transition)",
              }}
            >
              {isDark ? "☀" : "☾"}
            </button>
          </div>
        </nav>
      </header>
    </>
  );
}


export function NavBar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    setIsDark(saved !== "light");
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.style.backgroundColor = "#0a0a0f";
      document.documentElement.style.color = "#ffffff";
      document.body.style.backgroundColor = "#0a0a0f";
    } else {
      document.documentElement.style.backgroundColor = "#ffffff";
      document.documentElement.style.color = "#000000";
      document.body.style.backgroundColor = "#ffffff";
    }
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  return (
    <>
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          borderBottom: "1px solid rgba(99, 102, 241, 0.3)",
          background: "#0d0d14",
          height: 64,
        }}
      >
        <nav
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "0 1.5rem",
            height: "100%",
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <Link
            href="/"
            style={{
              fontWeight: 700,
              fontSize: "0.95rem",
              letterSpacing: "0.08em",
              color: "var(--cyan)",
              textDecoration: "none",
              justifySelf: "start",
              flexShrink: 0,
            }}
          >
            ◯ AETHER-LOGOS
          </Link>

          <div style={{ display: "flex", gap: "0.4rem", justifySelf: "center", alignItems: "center" }}>
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={active ? "text-white" : "text-gray-300 hover:text-purple-400"}
                  style={{
                    padding: "0.4rem 0.7rem",
                    borderRadius: 6,
                    fontSize: "0.84rem",
                    fontWeight: active ? 600 : 500,
                    textDecoration: "none",
                    border: active ? "1px solid rgba(255,255,255,0.14)" : "1px solid transparent",
                    background: active ? "rgba(255,255,255,0.04)" : "transparent",
                    transition: "all var(--transition)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", justifySelf: "end" }}>
            {mounted && <WalletMultiButton />}
            <button
              aria-label="Toggle theme"
              onClick={() => setIsDark((prev) => !prev)}
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: 6,
                width: 34,
                height: 34,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--text-secondary)",
                fontSize: "0.95rem",
                transition: "border-color var(--transition)",
              }}
            >
              {isDark ? "☀" : "☾"}
            </button>
          </div>
        </nav>
      </header>
    </>
  );
}
