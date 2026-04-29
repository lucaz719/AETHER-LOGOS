'use client';

import { useMemo, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { useAnchorClient } from "@/hooks/useAnchorClient";
import { useBuyerOrders } from "@/hooks/useBuyerOrders";
import { ESCROW_PROGRAM_ID } from "@/lib/anchor";
import { TrackingTimeline } from "@/components/TrackingTimeline";

const DEVNET_USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

function statusKey(status: unknown): string {
  if (!status || typeof status !== "object") return "unknown";
  return Object.keys(status as Record<string, unknown>)[0] ?? "unknown";
}

function countdown(deadline: number): string {
  const sec = Math.max(0, deadline - Math.floor(Date.now() / 1000));
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
}

function optionalString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const maybeSome = record.some;
    if (typeof maybeSome === "string") return maybeSome;
  }
  return undefined;
}

function getStatusColor(status: string): { badge: string; text: string } {
  switch (status) {
    case "awaitingShipment":
      return { badge: "bg-yellow-500/20 border-yellow-500/50 text-yellow-300", text: "Awaiting Shipment" };
    case "inTransit":
      return { badge: "bg-blue-500/20 border-blue-500/50 text-blue-300", text: "In Transit" };
    case "verified":
      return { badge: "bg-green-500/20 border-green-500/50 text-green-300", text: "Verified" };
    case "released":
      return { badge: "bg-purple-500/20 border-purple-500/50 text-purple-300", text: "Released" };
    case "disputed":
      return { badge: "bg-red-500/20 border-red-500/50 text-red-300", text: "Disputed" };
    default:
      return { badge: "bg-gray-500/20 border-gray-500/50 text-gray-300", text: status };
  }
}

export default function BuyerDashboardPage() {
  const { escrowProgram, wallet, connection } = useAnchorClient();
  const { orders, reload } = useBuyerOrders();
  const [error, setError] = useState<string | null>(null);

  const activeOrders = useMemo(
    () => orders.filter((o) => !["released", "cancelled"].includes(statusKey(o.account.status))),
    [orders],
  );

  const releaseFunds = async (order: { pubkey: PublicKey; account: Record<string, unknown> }) => {
    if (!escrowProgram || !wallet?.publicKey) return;
    try {
      const tradeId = order.account.tradeId as number[] | Uint8Array;
      const [escrowVault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), Buffer.from(tradeId)], ESCROW_PROGRAM_ID);
      const [vaultAuthority] = PublicKey.findProgramAddressSync([Buffer.from("authority")], ESCROW_PROGRAM_ID);

      // Derive seller's ATA automatically
      const sellerAta = await getAssociatedTokenAddress(
        DEVNET_USDC_MINT,
        new PublicKey((order.account.seller as PublicKey).toString())
      );

      await escrowProgram.methods
        .releaseFunds(Array.from(tradeId))
        .accounts({
          caller: wallet.publicKey,
          tradeAccount: order.pubkey,
          escrowVault,
          sellerTokenAccount: sellerAta,
          vaultAuthority,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "release failed");
    }
  };

  const openDispute = async (order: { pubkey: PublicKey; account: Record<string, unknown> }) => {
    if (!escrowProgram || !wallet?.publicKey) return;
    try {
      const tradeId = order.account.tradeId as number[] | Uint8Array;
      await escrowProgram.methods
        .openDispute(Array.from(tradeId))
        .accounts({
          disputer: wallet.publicKey,
          tradeAccount: order.pubkey,
        })
        .rpc();
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "open dispute failed");
    }
  };

  const cancelTrade = async (order: { pubkey: PublicKey; account: Record<string, unknown> }) => {
    if (!escrowProgram || !wallet?.publicKey) return;
    try {
      const tradeId = order.account.tradeId as number[] | Uint8Array;
      const [escrowVault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), Buffer.from(tradeId)], ESCROW_PROGRAM_ID);
      const [vaultAuthority] = PublicKey.findProgramAddressSync([Buffer.from("authority")], ESCROW_PROGRAM_ID);

      // Derive buyer's ATA automatically
      const buyerAta = await getAssociatedTokenAddress(
        DEVNET_USDC_MINT,
        wallet.publicKey
      );

      await escrowProgram.methods
        .cancelTrade(Array.from(tradeId))
        .accounts({
          buyer: wallet.publicKey,
          tradeAccount: order.pubkey,
          escrowVault,
          buyerTokenAccount: buyerAta,
          vaultAuthority,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "cancel trade failed");
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#12121a]/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Buyer Dashboard</h1>
            <p className="text-gray-400 mt-2">Track shipments, release funds, or manage disputes</p>
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

        {/* Active Orders */}
        <div className="bg-[#12121a] border border-white/10 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-white mb-8">Active Orders ({activeOrders.length})</h2>

          {activeOrders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No active orders. Your trades will appear here once created.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {activeOrders.map((order) => {
                const status = statusKey(order.account.status);
                const statusColor = getStatusColor(status);
                const deadline = Number(order.account.shipByDeadline ?? 0);
                const tracking = optionalString(order.account.trackingId);
                const invoiceCid = optionalString(order.account.invoiceCid);
                const amount = Number(order.account.amount ?? 0) / 1_000_000;
                const isPastDeadline = Math.floor(Date.now() / 1000) > deadline;

                return (
                  <div
                    key={order.pubkey.toBase58()}
                    className="bg-[#0a0a0f] border border-white/10 rounded-lg p-6 hover:border-white/20 transition"
                  >
                    {/* Trade Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-semibold text-white">Order from {(order.account.seller as PublicKey).toBase58().slice(0, 12)}...</h3>
                        <p className="text-xs text-gray-500 mt-2">{order.pubkey.toBase58()}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColor.badge}`}>
                        {statusColor.text}
                      </span>
                    </div>

                    {/* Amount and Timeline */}
                    <div className="grid md:grid-cols-3 gap-6 mb-6">
                      <div className="bg-[#12121a] border border-white/10 rounded-lg p-4">
                        <p className="text-xs text-gray-500 mb-1">Amount Locked</p>
                        <p className="text-2xl font-bold text-white">${amount.toFixed(2)}</p>
                      </div>
                      <div className="bg-[#12121a] border border-white/10 rounded-lg p-4">
                        <p className="text-xs text-gray-500 mb-1">Time Remaining</p>
                        <p className={`text-2xl font-bold ${isPastDeadline ? "text-red-400" : "text-white"}`}>
                          {isPastDeadline ? "Expired" : countdown(deadline)}
                        </p>
                      </div>
                      <div className="bg-[#12121a] border border-white/10 rounded-lg p-4">
                        <p className="text-xs text-gray-500 mb-1">Tracking</p>
                        <p className="text-lg font-mono text-purple-400">{tracking || "Pending"}</p>
                      </div>
                    </div>

                    {/* Timeline */}
                    {status === "inTransit" && (
                      <div className="mb-6 bg-[#12121a] border border-white/10 rounded-lg p-4">
                        <TrackingTimeline
                          milestones={[
                            { label: "Order Created", status: "completed" },
                            { label: "Funds Locked", status: "completed" },
                            { label: "Seller Shipped", status: "completed" },
                            { label: "In Transit", status: "active" },
                            { label: "Out for Delivery", status: "pending" },
                            { label: "Delivered", status: "pending" },
                            { label: "Funds Released", status: "pending" },
                          ]}
                        />
                      </div>
                    )}

                    {/* Invoice Link */}
                    {invoiceCid && (
                      <div className="mb-6">
                        <a
                          href={`https://gateway.pinata.cloud/ipfs/${invoiceCid}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-purple-400 hover:text-purple-300 text-sm transition"
                        >
                          View Invoice
                        </a>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 flex-wrap">
                      {status === "verified" && (
                        <button
                          onClick={() => void releaseFunds(order)}
                          className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/50 text-green-400 rounded-lg font-medium transition"
                        >
                          Release Funds
                        </button>
                      )}
                      {(status === "awaitingShipment" || status === "inTransit") && (
                        <button
                          onClick={() => void openDispute(order)}
                          className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 rounded-lg font-medium transition"
                        >
                          Open Dispute
                        </button>
                      )}
                      {status === "awaitingShipment" && isPastDeadline && (
                        <button
                          onClick={() => void cancelTrade(order)}
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
