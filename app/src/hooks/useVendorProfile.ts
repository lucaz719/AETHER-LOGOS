'use client';

import { useEffect, useMemo, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useAnchorClient } from "@/hooks/useAnchorClient";
import { MARKETPLACE_PROGRAM_ID } from "@/lib/anchor";

export type VendorProfileRow = {
  pubkey: PublicKey;
  account: Record<string, unknown>;
};

export function useVendorProfile(authority?: string) {
  const { connection } = useAnchorClient();
  const [profile, setProfile] = useState<VendorProfileRow | null>(null);

  const load = useMemo(
    () => async () => {
      if (!authority) return;
      try {
        const [pda] = PublicKey.findProgramAddressSync(
          [Buffer.from("vendor"), new PublicKey(authority).toBuffer()],
          MARKETPLACE_PROGRAM_ID,
        );
        const info = await connection.getAccountInfo(pda);
        if (!info) { setProfile(null); return; }
        const res = await fetch(`/api/marketplace/vendors/${authority}`);
        if (!res.ok) { setProfile(null); return; }
        const data = await res.json();
        setProfile({ pubkey: pda, account: data.vendor });
      } catch {
        setProfile(null);
      }
    },
    [authority, connection],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return { profile, reload: load };
}
