import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/hooks/useCart";
import { ToastProvider } from "@/hooks/useToast";
import { NavBar } from "@/components/NavBar";
import { WalletProviderWrapper } from "@/components/WalletProviderWrapper";
import { ThemeProvider } from "next-themes";

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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <WalletProviderWrapper>
            <CartProvider>
              <ToastProvider>
                <NavBar />
                <main className="min-h-screen pt-24">
                  {children}
                </main>
              </ToastProvider>
            </CartProvider>
          </WalletProviderWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}

