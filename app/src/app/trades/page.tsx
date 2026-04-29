'use client';

import { useEffect, useMemo, useState } from "react";
import { BN } from "@coral-xyz/anchor";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
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
  const { escrowProgram, wallet, connection, provider } = useAnchorClient();
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
      const sellerPubkey = new PublicKey(seller);
      const mintPubkey = new PublicKey(usdcMint);
      const payer = (provider?.wallet as { payer?: unknown } | undefined)?.payer;
      if (!payer) throw new Error("wallet payer is required to create associated token accounts");

      const buyerATA = await getOrCreateAssociatedTokenAccount(
        connection,
        payer as Parameters<typeof getOrCreateAssociatedTokenAccount>[1],
        mintPubkey,
        wallet.publicKey,
      );
      const sellerATA = await getOrCreateAssociatedTokenAccount(
        connection,
        payer as Parameters<typeof getOrCreateAssociatedTokenAccount>[1],
        mintPubkey,
        sellerPubkey,
      );
      setBuyerTokenAccount(buyerATA.address.toBase58());
      setSellerTokenAccount(sellerATA.address.toBase58());

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
          seller: sellerPubkey,
          tradeAccount,
          escrowVault,
          vaultAuthority,
          buyerTokenAccount: buyerATA.address,
          usdcMint: mintPubkey,
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

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "awaitingShipment":
        return "bg-yellow-500/20 border-yellow-500/50 text-yellow-300";
      case "inTransit":
        return "bg-blue-500/20 border-blue-500/50 text-blue-300";
      case "verified":
        return "bg-green-500/20 border-green-500/50 text-green-300";
      case "released":
        return "bg-purple-500/20 border-purple-500/50 text-purple-300";
      case "disputed":
        return "bg-red-500/20 border-red-500/50 text-red-300";
      default:
        return "bg-gray-500/20 border-gray-500/50 text-gray-300";
    }
  };

  const formatStatus = (status: string): string => {
    switch (status) {
      case "awaitingShipment":
        return "Awaiting Shipment";
      case "inTransit":
        return "In Transit";
      case "verified":
        return "Verified";
      case "released":
        return "Released";
      case "disputed":
        return "Disputed";
      default:
        return status;
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#12121a]/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white">Create Trade</h1>
              <p className="text-gray-400 mt-2">Lock USDC in escrow and initiate a trade settlement</p>
            </div>
            <WalletMultiButton />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Create Trade Form */}
        <div className="bg-[#12121a] border border-white/10 rounded-xl p-8 mb-12">
          <h2 className="text-2xl font-bold text-white mb-8">Create New Trade</h2>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-3">Amount (USDC)</label>
              <input
                type="number"
                placeholder="e.g., 1000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-[#0a0a0f] border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-3">Seller Wallet</label>
              <input
                type="text"
                placeholder="Solana address"
                value={seller}
                onChange={(e) => setSeller(e.target.value)}
                className="w-full bg-[#0a0a0f] border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition text-xs"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-3">USDC Mint Address</label>
              <input
                type="text"
                placeholder="Mint address"
                value={usdcMint}
                onChange={(e) => setUsdcMint(e.target.value)}
                className="w-full bg-[#0a0a0f] border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition text-xs"
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={signatureRequired}
                  onChange={(e) => setSignatureRequired(e.target.checked)}
                  className="w-5 h-5 accent-purple-500"
                />
                <span className="text-sm text-gray-300">Signature required on delivery</span>
              </label>
            </div>
          </div>

          <div className="mb-8">
            <InvoiceUpload onUploaded={setInvoiceUrl} />
          </div>

          <button
            onClick={() => void createTrade()}
            disabled={!wallet}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition shadow-lg hover:shadow-purple-500/50 shadow-purple-500/20"
          >
            Create Trade
          </button>
        </div>

        {/* Active Trades */}
        <div className="bg-[#12121a] border border-white/10 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-white mb-8">Active Trades</h2>

          {trades.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No active trades yet. Create your first trade above.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {trades.map((trade) => {
                const status = getStatusLabel(trade.account.status);
                const shipByDeadline = Number(trade.account.shipByDeadline ?? 0);
                const pastDeadline = shipByDeadline < Date.now() / 1000;
                const invoiceCid = optionalString(trade.account.invoiceCid);
                const tradeId = trade.pubkey.toBase58().slice(0, 8);

                return (
                  <div
                    key={trade.pubkey.toBase58()}
                    className="bg-[#0a0a0f] border border-white/10 rounded-lg p-6 hover:border-white/20 transition"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">Trade {tradeId}</h3>
                        <p className="text-xs text-gray-500 mt-1">{trade.pubkey.toBase58()}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(status)}`}>
                        {formatStatus(status)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-4 mb-6 text-sm">
                      {invoiceCid && (
                        <a
                          href={`https://gateway.pinata.cloud/ipfs/${invoiceCid}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-purple-400 hover:text-purple-300 transition"
                        >
                          View Invoice
                        </a>
                      )}
                      {pastDeadline && (
                        <span className="text-yellow-400">Past deadline</span>
                      )}
                    </div>

                    <div className="flex gap-3 flex-wrap">
                      {status === "verified" && (
                        <button
                          onClick={() => void releaseFunds(trade)}
                          className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/50 text-green-400 rounded-lg font-medium transition"
                        >
                          Release Funds
                        </button>
                      )}
                      {(status === "awaitingShipment" || status === "inTransit") && (
                        <button
                          onClick={() => void openDispute(trade)}
                          className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 rounded-lg font-medium transition"
                        >
                          Open Dispute
                        </button>
                      )}
                      {status === "awaitingShipment" && pastDeadline && (
                        <button
                          onClick={() => void cancelTrade(trade)}
                          className="px-4 py-2 bg-gray-600/20 hover:bg-gray-600/30 border border-gray-500/50 text-gray-400 rounded-lg font-medium transition"
                        >
                          Cancel Trade
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
