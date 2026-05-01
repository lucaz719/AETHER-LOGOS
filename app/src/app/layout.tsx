import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/hooks/useCart";
import { ToastProvider } from "@/hooks/useToast";
import { NavBar } from "@/components/NavBar";
import dynamic from "next/dynamic";

// Lazy-load the heavy Solana wallet provider.  It is only needed on
// wallet-connected pages, so deferring it cuts the initial parse cost for
// every public / non-wallet page significantly (wallet adapter + web3.js
// accounts for the majority of the 950+ module load reported).
const SolanaWalletProvider = dynamic(
  () => import("@/lib/wallet-provider").then((m) => ({ default: m.SolanaWalletProvider })),
  { ssr: false }
);

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
            <ToastProvider>
              <NavBar />
              <div style={{ minHeight: "calc(100vh - 64px)", paddingTop: 64 }}>
                {children}
              </div>
            </ToastProvider>
          </CartProvider>
        </SolanaWalletProvider>
      </body>
    </html>
  );
}

