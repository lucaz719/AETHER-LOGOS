"use client";

import { ReactNode, useEffect, useState } from "react";
import { SolanaWalletProvider } from "@/lib/wallet-provider";

export function WalletProviderWrapper({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch: don't render WalletProvider until after hydration.
  // Return null (not bare children) so useAnchorWallet never runs outside WalletProvider.
  if (!mounted) return null;

  return <SolanaWalletProvider>{children}</SolanaWalletProvider>;
}
