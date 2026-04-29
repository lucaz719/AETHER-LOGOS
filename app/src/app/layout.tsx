import type { Metadata } from "next";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import { SolanaWalletProvider } from "@/lib/wallet-provider";
import { CartProvider } from "@/hooks/useCart";
import { ToastProvider } from "@/hooks/useToast";
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
            <ToastProvider>
              <NavBar />
              <div style={{ minHeight: "calc(100vh - 60px)" }}>
                {children}
              </div>
            </ToastProvider>
          </CartProvider>
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
