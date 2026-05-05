'use client';

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Receipt,
  Users,
  BarChart3,
  Tag,
  Settings,
  ArrowLeft
} from "lucide-react";

const STORE_NAV = [
  { path: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "products", label: "Products", icon: Package },
  { path: "orders", label: "Orders", icon: Receipt },
  { path: "customers", label: "Customers", icon: Users },
  { path: "analytics", label: "Analytics", icon: BarChart3 },
  { path: "promotions", label: "Promotions", icon: Tag },
  { path: "settings", label: "Settings", icon: Settings },
];

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const { storeId } = useParams<{ storeId: string }>();
  const pathname = usePathname();

  return (
    <div className="mx-auto flex max-w-[1200px] gap-8 px-5 py-8">
      {/* Sidebar */}
      <aside className="sticky top-20 h-fit w-52 shrink-0 rounded-2xl border border-border bg-card py-4 shadow-sm">
        <div className="mb-2 px-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Store #{storeId}
          </p>
        </div>
        
        <Link
          href="/vendor/stores"
          className="group mb-4 flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
          All Stores
        </Link>
        
        <div className="mb-2 border-t border-border" />
        
        <nav className="flex flex-col gap-0.5 px-2">
          {STORE_NAV.map((nav) => {
            const href = `/vendor/store/${storeId}/${nav.path}`;
            const active = pathname === href || pathname.startsWith(href + "/");
            const Icon = nav.icon;
            
            return (
              <Link
                key={nav.path}
                href={href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
                  active 
                    ? "bg-primary/10 font-bold text-primary" 
                    : "font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon size={16} strokeWidth={active ? 2.5 : 2} />
                {nav.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="min-w-0 flex-1">
        {children}
      </main>
    </div>
  );
}
