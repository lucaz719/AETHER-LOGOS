'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Search, ShoppingCart, Menu, X } from "lucide-react";
import dynamic from "next/dynamic";

// Lazy-load WalletMultiButton so the heavy Solana adapter chunk is only
// fetched after the page hydrates, not during the initial HTML parse.
const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => ({ default: m.WalletMultiButton })),
  { ssr: false, loading: () => null }
);

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard", label: "Procurement" },
  { href: "/dashboard", label: "Risk Desk" },
];

interface PowerHeaderProps {
  onSearchOpen?: () => void;
  cartCount?: number;
}

export function PowerHeader({ onSearchOpen, cartCount = 0 }: PowerHeaderProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Cmd+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onSearchOpen?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSearchOpen]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        isScrolling
          ? "glass-header scrolling"
          : "glass-header"
      }`}
      style={{
        backgroundColor: isScrolling ? "rgba(255, 255, 255, 0.96)" : "rgba(255, 255, 255, 0.92)",
        borderBottom: isScrolling ? "1px solid rgba(0, 0, 0, 0.08)" : "1px solid rgba(0, 0, 0, 0.05)",
      }}
    >
      {/* ---- TIER 1: Global Utility Row ---- */}
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 border-b border-transparent"
        style={{
          borderBottomColor: isScrolling ? "rgba(0, 0, 0, 0.08)" : "rgba(0, 0, 0, 0.05)",
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex-shrink-0 font-bold text-base tracking-wider transition-colors hover:text-indigo-600"
          style={{
            color: "#0066FF",
            letterSpacing: "0.08em",
          }}
        >
          ◯ AETHER
        </Link>

        {/* Search Bar (Expands on focus) */}
        <div
          className="hidden sm:flex flex-1 max-w-md relative"
          style={{
            maxWidth: "320px",
          }}
        >
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              color: "#999999",
            }}
          />
          <input
            type="text"
            placeholder="Search..."
            onClick={onSearchOpen}
            className="w-full h-9 pl-9 pr-3 rounded-md border border-border bg-secondary text-sm transition-all"
            style={{
              borderColor: "#E5E5E5",
              backgroundColor: "#F8F9FA",
              color: "#1A1A1A",
              outline: "none",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#0066FF";
              e.currentTarget.style.backgroundColor = "#FFFFFF";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0, 102, 255, 0.08)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#E5E5E5";
              e.currentTarget.style.backgroundColor = "#F8F9FA";
              e.currentTarget.style.boxShadow = "none";
            }}
            readOnly
          />
          <kbd
            className="absolute right-2 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold"
            style={{
              backgroundColor: "rgba(0, 102, 255, 0.05)",
              color: "#0066FF",
              border: "1px solid rgba(0, 102, 255, 0.1)",
            }}
          >
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>

        {/* Right Utilities: Wallet + Cart + Mobile Menu */}
        <div
          className="flex items-center gap-2 sm:gap-3"
        >
          {/* Search button (mobile) */}
          <button
            onClick={onSearchOpen}
            className="sm:hidden p-2 rounded-md transition-colors hover:bg-secondary"
            style={{
              color: "#1A1A1A",
            }}
            aria-label="Search"
          >
            <Search size={18} />
          </button>

          {/* Wallet */}
          {mounted && <WalletMultiButton />}

          {/* Cart */}
          <button
            aria-label="Shopping cart"
            className="relative p-2 rounded-md border transition-colors hover:bg-secondary"
            style={{
              borderColor: "#E5E5E5",
              color: "#1A1A1A",
            }}
          >
            <ShoppingCart size={18} />
            {cartCount > 0 && (
              <span
                className="absolute top-0 right-0 inline-flex items-center justify-center h-5 w-5 rounded-full text-xs font-bold text-white"
                style={{
                  backgroundColor: "#0066FF",
                }}
              >
                {cartCount}
              </span>
            )}
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-2 rounded-md border transition-colors hover:bg-secondary"
            style={{
              borderColor: "#E5E5E5",
              color: "#1A1A1A",
            }}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* ---- TIER 2: Navigation Links (Desktop) ---- */}
      <div
        className="hidden sm:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center"
        style={{
          borderBottomColor: "rgba(0, 0, 0, 0.05)",
        }}
      >
        <nav className="flex items-center gap-6 lg:gap-8">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`text-sm font-medium pb-0.5 border-b-2 transition-colors ${
                  active
                    ? "text-primary border-primary"
                    : "text-secondary hover:text-foreground border-b-transparent"
                }`}
                style={{
                  color: active ? "#0066FF" : "#666666",
                  borderBottomColor: active ? "#0066FF" : "transparent",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ---- MOBILE MENU (Slides down) ---- */}
      {mobileMenuOpen && (
        <div
          className="sm:hidden border-t animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            borderTopColor: "rgba(0, 0, 0, 0.05)",
            backgroundColor: "#F8F9FA",
          }}
        >
          <nav className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-2">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-secondary hover:bg-secondary"
                  }`}
                  style={{
                    backgroundColor: active ? "rgba(0, 102, 255, 0.1)" : "transparent",
                    color: active ? "#0066FF" : "#666666",
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
