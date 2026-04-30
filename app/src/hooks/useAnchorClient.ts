'use client';

import { useMemo } from "react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { getEscrowProgram, getMarketProgram } from "@/lib/anchor";

export function useAnchorClient() {
  const wallet = useAnchorWallet();
  // Re-use the single Connection from the wallet adapter provider (M-6 fix)
  const { connection } = useConnection();
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

  return { escrowProgram, marketProgram, wallet, connection, provider };
}
