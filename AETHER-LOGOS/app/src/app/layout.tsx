import type { Metadata } from "next";
import dynamic from "next/dynamic";
import "./globals.css";

import { SolanaWalletProvider } from "../components/SolanaWalletProvider";

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
          {children}
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
