import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/hooks/useCart";
import { ToastProvider } from "@/hooks/useToast";
import { NavBar } from "@/components/NavBar";
import { WalletProviderWrapper } from "@/components/WalletProviderWrapper";
import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

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
      <body className={`${inter.className} ${inter.variable} ${jetBrainsMono.variable} antialiased`}>
        <WalletProviderWrapper>
          <CartProvider>
            <ToastProvider>
              <NavBar />
              <div style={{ minHeight: "calc(100vh - 64px)", paddingTop: 64 }}>
                {children}
              </div>
            </ToastProvider>
          </CartProvider>
        </WalletProviderWrapper>
      </body>
    </html>
  );
}

