import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/hooks/useCart";
import { ToastProvider } from "@/hooks/useToast";
import { NavBarConditional } from "@/components/NavBarConditional";
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
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <WalletProviderWrapper>
            <CartProvider>
              <ToastProvider>
                <NavBarConditional />
                <main className="min-h-screen">
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

