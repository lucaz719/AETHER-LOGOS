'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Menu, Moon, Sun, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import CartSheet from './CartSheet';

const WalletMultiButton = dynamic(
  async () => {
    const { WalletMultiButton } = await import('@solana/wallet-adapter-react-ui');
    return { default: WalletMultiButton };
  },
  { ssr: false }
);

const NAV_LINKS = [
  { href: '/stores',      label: 'Suppliers'    },
  { href: '/dashboard',   label: 'Procurement'  },
  { href: '/user/orders', label: 'My Orders'    },
  { href: '/admin',       label: 'Admin'        },
];

export function NavBar() {
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  useEffect(() => { setMounted(true); }, []);
  // Close drawer on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

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
    <>
      <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0">
              <div className="text-lg font-bold tracking-tighter text-foreground">AETHER</div>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    pathname === href
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>

            {/* Right utilities */}
            <div className="flex items-center gap-2 ml-auto">
              <div className="wallet-button-wrapper">
                <WalletMultiButton />
              </div>
              <CartSheet />
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="flex items-center justify-center w-11 h-11 rounded-lg hover:bg-secondary transition"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark'
                  ? <Sun className="h-5 w-5 text-foreground" />
                  : <Moon className="h-5 w-5 text-foreground" />}
              </button>

              {/* Burger button — mobile only */}
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="flex items-center justify-center w-11 h-11 rounded-lg hover:bg-secondary transition md:hidden"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                aria-controls="mobile-nav-drawer"
              >
                {menuOpen ? <X className="h-5 w-5 text-foreground" /> : <Menu className="h-5 w-5 text-foreground" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile drawer backdrop */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <div
        id="mobile-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`fixed top-0 right-0 z-50 h-full w-72 max-w-[85vw] bg-background border-l border-border shadow-2xl flex flex-col transition-transform duration-300 ease-in-out md:hidden ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-border flex-shrink-0">
          <span className="text-lg font-bold tracking-tighter text-foreground">AETHER</span>
          <button
            onClick={() => setMenuOpen(false)}
            className="flex items-center justify-center w-11 h-11 rounded-lg hover:bg-secondary transition"
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-foreground" />
          </button>
        </div>

        {/* Drawer nav links */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center rounded-xl px-4 py-3 text-base font-semibold transition min-h-[44px] ${
                pathname === href
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Wallet button at bottom of drawer */}
        <div className="flex-shrink-0 px-6 py-6 border-t border-border">
          <div className="wallet-button-wrapper w-full">
            <WalletMultiButton />
          </div>
        </div>
      </div>
    </>
  );
}
