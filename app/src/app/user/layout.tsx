'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { 
  LayoutDashboard, 
  Package, 
  Wallet, 
  Star, 
  UserCircle, 
  Settings, 
  MapPin,
  ChevronRight
} from "lucide-react";

const TRADE_NAV = [
  { href: "/user/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/user/orders", label: "Trade Ledger", icon: Package },
];

const ACCOUNT_NAV = [
  { href: "/user/wallet", label: "Identity Wallet", icon: Wallet },
  { href: "/user/profile", label: "Public Profile", icon: UserCircle },
  { href: "/user/addresses", label: "Address Book", icon: MapPin },
  { href: "/user/reviews", label: "Trust Reviews", icon: Star },
  { href: "/user/settings", label: "System Settings", icon: Settings },
];

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  return (
    <div className="mx-auto max-w-7xl px-4 pt-24 pb-12 lg:px-8">

      {/* ── Mobile horizontal tab nav (hidden on lg+) ── */}
      <nav
        className="mb-6 overflow-x-auto hide-scrollbar lg:hidden"
        aria-label="Account navigation"
      >
        <div className="flex gap-1 pb-1 min-w-max">
          {[...TRADE_NAV, ...ACCOUNT_NAV].map((link) => {
            const active =
              pathname === link.href ||
              (link.href !== "/user" && pathname.startsWith(link.href + "/"));
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon size={15} />
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Main layout: sidebar (desktop) + content ── */}
      <div className="flex gap-8">
        {/* Sidebar — desktop only */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <nav className="glass sticky top-24 flex flex-col gap-8 rounded-3xl p-6 shadow-card">
            <Section title="Trade Terminal" items={TRADE_NAV} pathname={pathname} />
            <Section title="Institutional Account" items={ACCOUNT_NAV} pathname={pathname} />
            
            <div className="mt-4 rounded-2xl bg-primary/5 p-4 border border-primary/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Status</p>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-bold text-foreground">Verified Entity</span>
              </div>
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  items,
  pathname,
}: {
  title: string;
  items: Array<{ href: string; label: string; icon: ComponentType<{ size?: number; className?: string }> }>;
  pathname: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-1">
        {items.map((link) => {
          const active = pathname === link.href || (link.href !== "/user" && pathname.startsWith(link.href + "/"));
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`group flex items-center justify-between rounded-xl px-3 py-2.5 transition-all hover:bg-primary/5 ${
                active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} className={active ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'} />
                <span className="text-sm font-bold tracking-tight">{link.label}</span>
              </div>
              {active && <ChevronRight size={14} className="text-primary" />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
