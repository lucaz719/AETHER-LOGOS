"use client";

import dynamic from "next/dynamic";
import { ReactNode } from "react";

const SolanaWalletProvider = dynamic(
  () => import("@/lib/wallet-provider").then((m) => ({ default: m.SolanaWalletProvider })),
  { ssr: false }
);

export function WalletProviderWrapper({ children }: { children: ReactNode }) {
  return <SolanaWalletProvider>{children}</SolanaWalletProvider>;
}
