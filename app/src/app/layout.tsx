import type { Metadata } from "next";
import Link from "next/link";
import { SolanaWalletProvider } from "@/lib/wallet-provider";
import { CartProvider } from "@/hooks/useCart";

export const metadata: Metadata = {
  title: "AETHER-LOGOS | Trade Settlement Protocol",
  description: "Asset-Light Trade Settlement Protocol on Solana",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SolanaWalletProvider>
          <CartProvider>
            <header style={{ borderBottom: "1px solid #ddd", padding: "1rem" }}>
              <nav style={{ display: "flex", gap: "1rem", maxWidth: "1100px", margin: "0 auto" }}>
                <Link href="/">Home</Link>
                <Link href="/marketplace">Marketplace</Link>
                <Link href="/dashboard/buyer">Buyer Dashboard</Link>
                <Link href="/dashboard/seller">Seller Dashboard</Link>
                <Link href="/vendor/dashboard">Vendor</Link>
                <Link href="/trades">Trades</Link>
                <Link href="/markets">Markets</Link>
              </nav>
            </header>
            {children}
          </CartProvider>
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
