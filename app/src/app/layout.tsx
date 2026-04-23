import type { Metadata } from "next";
import "./globals.css";
import { SolanaWalletProvider } from "@/lib/wallet-provider";
import { CartProvider } from "@/hooks/useCart";
import { NavBar } from "@/components/NavBar";

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
            <NavBar />
            <div style={{ minHeight: "calc(100vh - 60px)" }}>
              {children}
            </div>
          </CartProvider>
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
