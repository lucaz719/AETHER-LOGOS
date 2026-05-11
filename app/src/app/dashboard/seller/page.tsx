'use client';

import { useMemo, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useAnchorClient } from "@/hooks/useAnchorClient";
import { useSellerOrders } from "@/hooks/useSellerOrders";
import { fetchAgent } from "@/lib/agentApi";
import { AGENT_URL } from "@/lib/config";
import { TrackingTimeline } from "@/components/TrackingTimeline";

function statusKey(status: unknown): string {
  if (!status || typeof status !== "object") return "unknown";
  return Object.keys(status as Record<string, unknown>)[0] ?? "unknown";
}

function formatCountdown(deadline: number): string {
  const sec = Math.max(0, deadline - Math.floor(Date.now() / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${m}m`;
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

export default function SellerDashboardPage() {
  const { escrowProgram, wallet } = useAnchorClient();
  const { orders, reload } = useSellerOrders();
  const [trackingIds, setTrackingIds] = useState<Record<string, string>>({});
  const [carriers, setCarriers] = useState<Record<string, "dhl" | "fedEx" | "ups" | "maersk" | "usps">>({});
  const [error, setError] = useState<string | null>(null);

  const byStatus = useMemo(() => {
    const awaiting = orders.filter((o) => statusKey(o.account.status) === "awaitingShipment");
    const inTransit = orders.filter((o) => statusKey(o.account.status) === "inTransit");
    const completed = orders.filter((o) => statusKey(o.account.status) === "released");
    return { awaiting, inTransit, completed };
  }, [orders]);

  const submitTracking = async (order: { pubkey: PublicKey; account: Record<string, unknown> }) => {
    if (!escrowProgram || !wallet?.publicKey) return;
    const key = order.pubkey.toBase58();
    const tracking = trackingIds[key]?.trim() ?? "";
    const carrier = carriers[key] ?? "dhl";
    if (!tracking) {
      setError("Tracking ID is required");
      return;
    }
    try {
      setError(null);
      const tradeId = order.account.tradeId as number[] | Uint8Array;
      await escrowProgram.methods
        .submitTracking(Array.from(tradeId), tracking, { [carrier]: {} })
        .accounts({
          seller: wallet.publicKey,
          tradeAccount: order.pubkey,
        })
        .rpc();

      // Register with Go agent for automated proof submission
      fetchAgent(`${AGENT_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tracking_id: tracking,
          wallet: wallet.publicKey.toString(),
          callback_url: "",
          carrier: carrier.toLowerCase(),
          trade_account: order.pubkey.toString(),
          trade_id: Buffer.from(tradeId).toString("hex"),
        }),
      }).catch((e) => console.warn("Agent registration failed (non-fatal):", e));

      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "submit tracking failed");
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#12121a]/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Seller Dashboard</h1>
            <p className="text-gray-400 mt-2">Manage pending orders and track active shipments</p>
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

        {/* Pending Orders */}
        <div className="mb-12">
          <div className="bg-[#12121a] border border-white/10 rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-white mb-8">New Orders ({byStatus.awaiting.length})</h2>

            {byStatus.awaiting.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">No pending orders. Incoming orders will appear here.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {byStatus.awaiting.map((order) => {
                  const key = order.pubkey.toBase58();
                  const amount = Number(order.account.amount ?? 0) / 1_000_000;
                  const deadline = Number(order.account.shipByDeadline ?? 0);
                  const invoiceCid = optionalString(order.account.invoiceCid);

                  return (
                    <div
                      key={key}
                      className="bg-[#0a0a0f] border border-white/10 rounded-lg p-6 hover:border-white/20 transition"
                    >
                      {/* Order Header */}
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            Order from {(order.account.buyer as PublicKey).toBase58().slice(0, 12)}...
                          </h3>
                          <p className="text-xs text-gray-500 mt-2">{key}</p>
                        </div>
                        <span className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded-full text-sm font-medium text-yellow-300">
                          Awaiting Shipment
                        </span>
                      </div>

                      {/* Order Details */}
                      <div className="grid md:grid-cols-3 gap-6 mb-6">
                        <div className="bg-[#12121a] border border-white/10 rounded-lg p-4">
                          <p className="text-xs text-gray-500 mb-1">Amount Locked</p>
                          <p className="text-2xl font-bold text-green-400">${amount.toFixed(2)}</p>
                        </div>
                        <div className="bg-[#12121a] border border-white/10 rounded-lg p-4">
                          <p className="text-xs text-gray-500 mb-1">Ship By</p>
                          <p className="text-lg font-semibold text-white">{formatCountdown(deadline)}</p>
                        </div>
                        <div className="bg-[#12121a] border border-white/10 rounded-lg p-4">
                          <p className="text-xs text-gray-500 mb-1">Auto Refund</p>
                          <p className="text-lg font-semibold text-yellow-400">{formatCountdown(deadline)}</p>
                        </div>
                      </div>

                      {/* Invoice */}
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

                      {/* Tracking Form */}
                      <div className="bg-[#12121a] border border-white/10 rounded-lg p-6">
                        <h4 className="text-sm font-semibold text-white mb-4">Submit Tracking</h4>
                        <div className="space-y-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-gray-300 mb-2">Carrier</label>
                              <select
                                value={carriers[key] ?? "dhl"}
                                onChange={(e) =>
                                  setCarriers((prev) => ({
                                    ...prev,
                                    [key]: e.target.value as "dhl" | "fedEx" | "ups" | "maersk" | "usps",
                                  }))
                                }
                                className="w-full bg-[#0a0a0f] border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500/50 transition"
                              >
                                <option value="dhl">DHL</option>
                                <option value="fedEx">FedEx</option>
                                <option value="ups">UPS</option>
                                <option value="maersk">Maersk</option>
                                <option value="usps">USPS</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-300 mb-2">Tracking ID</label>
                              <input
                                type="text"
                                placeholder="e.g., 1234567890"
                                value={trackingIds[key] ?? ""}
                                onChange={(e) =>
                                  setTrackingIds((prev) => ({ ...prev, [key]: e.target.value }))
                                }
                                className="w-full bg-[#0a0a0f] border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition"
                              />
                            </div>
                          </div>
                          <button
                            onClick={() => void submitTracking(order)}
                            className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-lg transition"
                          >
                            Submit Tracking
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Active Shipments */}
        <div className="mb-12">
          <div className="bg-[#12121a] border border-white/10 rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-white mb-8">Active Shipments ({byStatus.inTransit.length})</h2>

            {byStatus.inTransit.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">No active shipments in transit.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {byStatus.inTransit.map((order) => {
                  const invoiceCid = optionalString(order.account.invoiceCid);
                  const amount = Number(order.account.amount ?? 0) / 1_000_000;

                  return (
                    <div
                      key={order.pubkey.toBase58()}
                      className="bg-[#0a0a0f] border border-white/10 rounded-lg p-6 hover:border-white/20 transition"
                    >
                      {/* Shipment Header */}
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <h3 className="text-lg font-semibold text-white">Order {order.pubkey.toBase58().slice(0, 12)}...</h3>
                          <p className="text-sm text-gray-400 mt-2">{amount.toFixed(2)} USDC • Tracking: {optionalString(order.account.trackingId) || "—"}</p>
                        </div>
                        <span className="px-3 py-1 bg-blue-500/20 border border-blue-500/50 rounded-full text-sm font-medium text-blue-300">
                          In Transit
                        </span>
                      </div>

                      {/* Timeline */}
                      <div className="bg-[#12121a] border border-white/10 rounded-lg p-4">
                        <TrackingTimeline
                          milestones={[
                            { label: "Order Created", status: "completed" },
                            { label: "Seller Shipped", status: "completed" },
                            { label: "In Transit", status: "active" },
                            { label: "Delivered", status: "pending" },
                          ]}
                        />
                      </div>

                      {/* Invoice */}
                      {invoiceCid && (
                        <div className="mt-4">
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Completed Orders */}
        <div>
          <div className="bg-[#12121a] border border-white/10 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-8">Completed Orders ({byStatus.completed.length})</h2>

            {byStatus.completed.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">No completed orders yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {byStatus.completed.map((order) => {
                  const invoiceCid = optionalString(order.account.invoiceCid);
                  const amount = Number(order.account.amount ?? 0) / 1_000_000;

                  return (
                    <div
                      key={order.pubkey.toBase58()}
                      className="bg-[#0a0a0f] border border-white/10 rounded-lg p-6 hover:border-white/20 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-white">Order {order.pubkey.toBase58().slice(0, 12)}...</h3>
                          <p className="text-sm text-green-400 mt-2">{amount.toFixed(2)} USDC received • Tracking: {optionalString(order.account.trackingId) || "—"}</p>
                        </div>
                        <span className="px-3 py-1 bg-purple-500/20 border border-purple-500/50 rounded-full text-sm font-medium text-purple-300">
                          Released
                        </span>
                      </div>

                      {/* Invoice */}
                      {invoiceCid && (
                        <div className="mt-4">
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
