'use client';

import { useMemo } from "react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { Connection } from "@solana/web3.js";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { getEscrowProgram, getMarketProgram, getMarketplaceProgram } from "@/lib/anchor";

export function useAnchorClient() {
  const wallet = useAnchorWallet();
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  const connection = useMemo(() => new Connection(endpoint, "confirmed"), [endpoint]);
  const provider = useMemo(
    () => (wallet ? new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions()) : null),
    [connection, wallet],
  );
  const escrowProgram = useMemo(
    () => (provider ? getEscrowProgram(provider) : null),
    [provider],
  );
  const marketProgram = useMemo(
    () => (provider ? getMarketProgram(provider) : null),
    [provider],
  );

  const marketplaceProgram = useMemo(
    () => (provider ? getMarketplaceProgram(provider) : null),
    [provider],
  );

  return { escrowProgram, marketProgram, marketplaceProgram, wallet, connection, provider };
}
