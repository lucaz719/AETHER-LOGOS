import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartProvider } from "@/hooks/useCart";
import { ToastProvider } from "@/hooks/useToast";
import { NavBarConditional } from "@/components/NavBarConditional";
import { WalletProviderWrapper } from "@/components/WalletProviderWrapper";
import { OnboardingProvider } from "@/lib/context/OnboardingContext";
import { ThemeProvider } from "next-themes";

export const metadata: Metadata = {
  title: "AETHER-LOGOS | Trade Settlement Protocol",
  description: "Asset-Light Trade Settlement Protocol on Solana",
};

export const viewport: Viewport = {
  themeColor: "#0d0d14",
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
          <OnboardingProvider>
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
          </OnboardingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

