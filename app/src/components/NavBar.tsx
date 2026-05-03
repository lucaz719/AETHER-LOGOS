'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { ShoppingCart, Moon, Sun } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useCart } from '@/hooks/useCart';

// Dynamically import wallet button to avoid hydration issues
const WalletMultiButton = dynamic(
  async () => {
    const { WalletMultiButton } = await import('@solana/wallet-adapter-react-ui');
    return { default: WalletMultiButton };
  },
  { ssr: false }
);

export function NavBar() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const { items } = useCart();
  const cartCount = items.length;

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="h-8 w-24 bg-muted rounded animate-pulse" />
              <div className="hidden h-8 w-48 bg-muted rounded animate-pulse md:block" />
            </div>
            <div className="flex items-center gap-4">
              <div className="h-10 w-24 bg-muted rounded animate-pulse" />
              <div className="h-10 w-10 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Single Row: Logo | Search | Utilities */}
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <div className="text-lg font-bold tracking-tighter text-foreground">
              AETHER
            </div>
          </Link>

          {/* Search Bar - Hidden on mobile, visible on sm+ */}
          <div className="hidden flex-1 max-w-sm md:block">
            <div className="relative">
              <input
                type="text"
                placeholder="Search products, markets..."
                readOnly
                className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground placeholder-muted-foreground cursor-pointer transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 transform rounded border border-border bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Right Utilities: Wallet + Cart + Theme */}
          <div className="flex items-center gap-3 ml-auto">
            {/* Wallet Button - Wrapped with styling override */}
            <div className="wallet-button-wrapper">
              <WalletMultiButton />
            </div>

            {/* Cart Button */}
            <Link
              href="/cart"
              className="relative p-2 rounded-lg hover:bg-secondary transition"
              aria-label="Shopping cart"
            >
              <ShoppingCart className="h-5 w-5 text-foreground" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg hover:bg-secondary transition"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5 text-foreground" />
              ) : (
                <Moon className="h-5 w-5 text-foreground" />
              )}
            </button>
          </div>
        </div>

      </div>
    </nav>
  );
}
