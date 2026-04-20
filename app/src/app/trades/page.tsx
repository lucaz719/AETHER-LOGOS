'use client';

import { useEffect, useMemo, useState } from "react";
import { BN } from "@coral-xyz/anchor";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useAnchorClient } from "@/hooks/useAnchorClient";
import { ESCROW_PROGRAM_ID } from "@/lib/anchor";
import { InvoiceUpload } from "@/components/InvoiceUpload";

type TradeRow = {
  pubkey: PublicKey;
  account: Record<string, unknown>;
};

function getStatusLabel(status: unknown): string {
  if (typeof status === "string") return status;
  if (status && typeof status === "object") {
    return Object.keys(status as Record<string, unknown>)[0] ?? "unknown";
  }
  return "unknown";
}

function optionalString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const maybeSome = record.some;
    if (typeof maybeSome === "string") return maybeSome;
  }
  return null;
}

export default function TradesPage() {
  const { escrowProgram, wallet } = useAnchorClient();
  const [amount, setAmount] = useState("1");
  const [seller, setSeller] = useState("");
  const [buyerTokenAccount, setBuyerTokenAccount] = useState("");
  const [sellerTokenAccount, setSellerTokenAccount] = useState("");
  const [usdcMint, setUsdcMint] = useState("");
  const [signatureRequired, setSignatureRequired] = useState(true);
  const [invoiceUrl, setInvoiceUrl] = useState("");
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadTrades = useMemo(
    () => async () => {
      if (!escrowProgram || !wallet?.publicKey) return;
      const rows = (await (escrowProgram.account as any).tradeAccount.all()) as TradeRow[];
      const own = rows.filter(
        (r) => (r.account.buyer as PublicKey).toBase58() === wallet.publicKey.toBase58(),
      );
      setTrades(own);
    },
    [escrowProgram, wallet?.publicKey],
  );

  useEffect(() => {
    void loadTrades();
    const id = setInterval(() => void loadTrades(), 10_000);
    return () => clearInterval(id);
  }, [loadTrades]);

  const createTrade = async () => {
    if (!escrowProgram || !wallet?.publicKey) return;
    try {
      setError(null);
      const tradeId = crypto.getRandomValues(new Uint8Array(32));
      const amountUsdc = Math.floor(Number(amount) * 1_000_000);
      const milestoneHash = new Uint8Array(32);
      const [tradeAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("trade"), wallet.publicKey.toBuffer(), tradeId],
        ESCROW_PROGRAM_ID,
      );
      const [escrowVault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), tradeId], ESCROW_PROGRAM_ID);
      const [vaultAuthority] = PublicKey.findProgramAddressSync([Buffer.from("authority")], ESCROW_PROGRAM_ID);
      const invoiceCid = invoiceUrl.includes("/ipfs/") ? invoiceUrl.split("/ipfs/")[1] : null;

      await escrowProgram.methods
        .createTrade(
          Array.from(tradeId),
          new BN(amountUsdc),
          Array.from(milestoneHash),
          signatureRequired,
          invoiceCid,
        )
        .accounts({
          buyer: wallet.publicKey,
          seller: new PublicKey(seller),
          tradeAccount,
          escrowVault,
          vaultAuthority,
          buyerTokenAccount: new PublicKey(buyerTokenAccount),
          usdcMint: new PublicKey(usdcMint),
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      await loadTrades();
    } catch (e) {
      setError(e instanceof Error ? e.message : "create trade failed");
    }
  };

  const releaseFunds = async (trade: TradeRow) => {
    if (!escrowProgram || !wallet?.publicKey) return;
    try {
      const tradeId = trade.account.tradeId as number[] | Uint8Array;
      const [escrowVault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), Buffer.from(tradeId)], ESCROW_PROGRAM_ID);
      const [vaultAuthority] = PublicKey.findProgramAddressSync([Buffer.from("authority")], ESCROW_PROGRAM_ID);
      await escrowProgram.methods
        .releaseFunds(Array.from(tradeId))
        .accounts({
          caller: wallet.publicKey,
          tradeAccount: trade.pubkey,
          escrowVault,
          vaultAuthority,
          sellerTokenAccount: new PublicKey(sellerTokenAccount),
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      await loadTrades();
    } catch (e) {
      setError(e instanceof Error ? e.message : "release funds failed");
    }
  };

  const cancelTrade = async (trade: TradeRow) => {
    if (!escrowProgram || !wallet?.publicKey) return;
    try {
      const tradeId = trade.account.tradeId as number[] | Uint8Array;
      const [escrowVault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), Buffer.from(tradeId)], ESCROW_PROGRAM_ID);
      const [vaultAuthority] = PublicKey.findProgramAddressSync([Buffer.from("authority")], ESCROW_PROGRAM_ID);
      await escrowProgram.methods
        .cancelTrade(Array.from(tradeId))
        .accounts({
          buyer: wallet.publicKey,
          tradeAccount: trade.pubkey,
          escrowVault,
          buyerTokenAccount: new PublicKey(buyerTokenAccount),
          vaultAuthority,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      await loadTrades();
    } catch (e) {
      setError(e instanceof Error ? e.message : "cancel trade failed");
    }
  };

  const openDispute = async (trade: TradeRow) => {
    if (!escrowProgram || !wallet?.publicKey) return;
    try {
      const tradeId = trade.account.tradeId as number[] | Uint8Array;
      await escrowProgram.methods
        .openDispute(Array.from(tradeId))
        .accounts({
          disputer: wallet.publicKey,
          tradeAccount: trade.pubkey,
        })
        .rpc();
      await loadTrades();
    } catch (e) {
      setError(e instanceof Error ? e.message : "open dispute failed");
    }
  };

  return (
    <main style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem" }}>
      <h1>Trade Escrow Dashboard</h1>
      <WalletMultiButton />
      <p>Create and manage trade escrows with zkTLS-verified delivery.</p>
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <section style={{ marginTop: "2rem", display: "grid", gap: "0.75rem" }}>
        <h2>Create New Trade</h2>
        <input placeholder="Amount (USDC)" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <input placeholder="Seller wallet" value={seller} onChange={(e) => setSeller(e.target.value)} />
        <input placeholder="Buyer USDC token account" value={buyerTokenAccount} onChange={(e) => setBuyerTokenAccount(e.target.value)} />
        <input placeholder="Seller USDC token account" value={sellerTokenAccount} onChange={(e) => setSellerTokenAccount(e.target.value)} />
        <input placeholder="USDC mint" value={usdcMint} onChange={(e) => setUsdcMint(e.target.value)} />
        <label>
          <input type="checkbox" checked={signatureRequired} onChange={(e) => setSignatureRequired(e.target.checked)} />
          Signature required on delivery
        </label>
        <InvoiceUpload onUploaded={setInvoiceUrl} />
        <button onClick={() => void createTrade()} disabled={!wallet}>Create Trade</button>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Active Trades</h2>
        {trades.length === 0 && <p>No active trades.</p>}
        {trades.map((trade) => {
          const status = getStatusLabel(trade.account.status);
          const shipByDeadline = Number(trade.account.shipByDeadline ?? 0);
          const pastDeadline = shipByDeadline < Date.now() / 1000;
          const invoiceCid = optionalString(trade.account.invoiceCid);
          return (
            <div key={trade.pubkey.toBase58()} style={{ border: "1px solid #ddd", padding: "0.75rem", marginBottom: "0.75rem" }}>
              <div><strong>{trade.pubkey.toBase58()}</strong></div>
              <div>Status: <span>{status}</span></div>
              {invoiceCid && (
                <div>
                  <a href={`https://gateway.pinata.cloud/ipfs/${invoiceCid}`} target="_blank" rel="noreferrer">
                    View Invoice
                  </a>
                </div>
              )}
              {status === "verified" && <button onClick={() => void releaseFunds(trade)}>Release Funds</button>}
              {(status === "awaitingShipment" || status === "inTransit") && (
                <button onClick={() => void openDispute(trade)}>Open Dispute</button>
              )}
              {status === "awaitingShipment" && pastDeadline && (
                <button onClick={() => void cancelTrade(trade)}>Cancel Trade</button>
              )}
            </div>
          );
        })}
      </section>
    </main>
  );
}
