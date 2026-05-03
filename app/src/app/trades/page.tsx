'use client';

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { useAnchorClient } from "@/hooks/useAnchorClient";
import { ESCROW_PROGRAM_ID } from "@/lib/anchor";
import { InvoiceUpload } from "@/components/InvoiceUpload";
import { Copy, CheckCircle, Info } from "lucide-react";

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

function truncateAddress(addr: string): string {
  return addr.slice(0, 6) + "..." + addr.slice(-6);
}

function TradesPageContent() {
  const searchParams = useSearchParams();
  const { escrowProgram, wallet, connection, provider } = useAnchorClient();
  const [quantity, setQuantity] = useState("1");
  const [seller, setSeller] = useState("");
  const [buyerTokenAccount, setBuyerTokenAccount] = useState("");
  const [sellerTokenAccount, setSellerTokenAccount] = useState("");
  const [usdcMint, setUsdcMint] = useState("EPjFWaLb3hyccqaAjRmjRAmsPd83Un1Zc1zLH3BckKQi");
  const [signatureRequired, setSignatureRequired] = useState(true);
  const [invoiceUrl, setInvoiceUrl] = useState("");
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);

  const [tradeMetadata, setTradeMetadata] = useState<{
    productId?: string;
    title?: string;
    tier?: string;
    moq?: string;
    leadTimeDays?: string;
    priceUsdc?: number;
  }>({});

  useEffect(() => {
    const sellerWallet = searchParams?.get("sellerWallet");
    const usdcMintParam = searchParams?.get("usdcMint");
    const productId = searchParams?.get("productId");
    const title = searchParams?.get("title");
    const tier = searchParams?.get("tier");
    const moq = searchParams?.get("moq");
    const leadTimeDays = searchParams?.get("leadTimeDays");
    const priceUsdc = searchParams?.get("priceUsdc");

    if (sellerWallet) setSeller(sellerWallet);
    if (usdcMintParam) setUsdcMint(usdcMintParam);
    if (moq) setQuantity(moq);
    setTradeMetadata({
      productId: productId || undefined,
      title: title || undefined,
      tier: tier || undefined,
      moq: moq || undefined,
      leadTimeDays: leadTimeDays || undefined,
      priceUsdc: priceUsdc ? Number(priceUsdc) : undefined,
    });
  }, [searchParams]);

  const price = tradeMetadata.priceUsdc || 0;
  const qty = Math.max(1, parseInt(quantity) || 1);
  const subtotal = price * qty;
  const platformFee = subtotal * 0.02;
  const grandTotal = subtotal + platformFee;

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
      const amountUsdc = Math.floor(grandTotal > 0 ? grandTotal * 1_000_000 : 1_000_000);
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

      fetch("http://localhost:8080/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tracking_id: "",
          wallet: wallet.publicKey.toString(),
          callback_url: "",
          carrier: "dhl",
          trade_account: tradeAccount.toString(),
          trade_id: Buffer.from(tradeId).toString("hex"),
        }),
      }).catch((e) => console.warn("Agent registration failed (non-fatal):", e));

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
    <main className="min-h-screen bg-background text-foreground pt-24">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-10 pt-8 sm:px-6 lg:px-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Create Trade</h1>
          <p className="text-muted-foreground">Lock USDC in escrow and initiate settlement</p>
        </header>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        )}

        {tradeMetadata.title && (
          <div className="rounded-lg border border-primary/50 bg-card/50 p-6 backdrop-blur-sm">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Product</p>
                <p className="text-lg font-semibold text-foreground">{tradeMetadata.title}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Seller Tier</p>
                  <p className="font-mono text-sm text-foreground capitalize">{tradeMetadata.tier}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">MOQ</p>
                  <p className="font-mono text-sm text-foreground">{tradeMetadata.moq} units</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Lead Time</p>
                  <p className="font-mono text-sm text-foreground">{tradeMetadata.leadTimeDays} days</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Product ID</p>
                  <p className="font-mono text-xs text-muted-foreground">{tradeMetadata.productId}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border/50 bg-card/30 p-8 backdrop-blur-sm">
          <div className="mb-8 space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Create New Trade</h2>
            <p className="text-sm text-muted-foreground">Complete the escrow settlement for your order</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Quantity</label>
              <input
                type="number"
                min="1"
                placeholder="e.g., 100"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground placeholder-muted-foreground transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              {tradeMetadata.priceUsdc && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Unit Price: <span className="font-mono font-medium text-foreground">${tradeMetadata.priceUsdc.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Seller Wallet</label>
              <div className="relative flex items-center rounded-lg border border-border bg-card px-4 py-2.5">
                <code className="flex-1 text-xs font-mono text-muted-foreground">{seller ? truncateAddress(seller) : "Not set"}</code>
                {seller && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(seller);
                      setCopiedAddr(seller);
                      setTimeout(() => setCopiedAddr(null), 2000);
                    }}
                    className="ml-2 p-1 hover:bg-primary/10 rounded transition"
                    title="Copy full address"
                  >
                    {copiedAddr === seller ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Auto-filled from marketplace</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">USDC Mint</label>
              <div className="relative flex items-center rounded-lg border border-border bg-card px-4 py-2.5">
                <code className="flex-1 text-xs font-mono text-muted-foreground">{truncateAddress(usdcMint)}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(usdcMint);
                    setCopiedAddr(usdcMint);
                    setTimeout(() => setCopiedAddr(null), 2000);
                  }}
                  className="ml-2 p-1 hover:bg-primary/10 rounded transition"
                  title="Copy full address"
                >
                  {copiedAddr === usdcMint ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Devnet USDC</p>
            </div>
          </div>

          {tradeMetadata.priceUsdc && (
            <div className="mt-6 rounded-xl border border-border bg-card/50 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground mb-4">Order Summary</h3>
              <div className="space-y-2.5 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Subtotal ({qty} items)</span>
                  <span className="font-mono">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Fee (2%)</span>
                  <span className="font-mono">${platformFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="pt-3 mt-3 border-t border-border flex justify-between font-bold text-foreground text-base">
                  <span>Grand Total</span>
                  <span className="font-mono">${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-2">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={signatureRequired}
                  onChange={(e) => setSignatureRequired(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <span className="text-sm text-foreground">Signature required on delivery</span>
              </label>
              <div className="group relative flex items-center justify-center">
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                <div className="absolute bottom-full left-1/2 mb-2 w-64 -translate-x-1/2 hidden rounded-lg bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg group-hover:block border border-border/50 z-50">
                  When enabled, the shipping carrier must obtain a physical signature upon delivery. The signer's name will be extracted from the zkTLS delivery proof and stored immutably on-chain.
                </div>
              </div>
            </div>

            <div>
              <InvoiceUpload onUploaded={setInvoiceUrl} />
            </div>
          </div>

          <button
            onClick={() => void createTrade()}
            disabled={!wallet}
            className="mt-8 w-full rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-all hover:shadow-lg hover:shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {wallet ? "Create Trade" : "Connect Wallet to Continue"}
          </button>
        </div>

        <div className="mt-12 space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Active Trades</h2>

          {trades.length === 0 ? (
            <div className="rounded-lg border border-border/50 bg-card/30 p-12 text-center backdrop-blur-sm">
              <p className="text-muted-foreground">No active trades yet. Create your first trade above.</p>
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
                    className="rounded-lg border border-border/50 bg-card/30 p-6 transition hover:border-primary/50 hover:bg-card/50 backdrop-blur-sm"
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">Trade {tradeId}</h3>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">{trade.pubkey.toBase58()}</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-sm font-medium ${getStatusColor(status)}`}>
                        {formatStatus(status)}
                      </span>
                    </div>

                    <div className="mb-6 flex flex-wrap gap-4 text-sm">
                      {invoiceCid && (
                        <a
                          href={`https://gateway.pinata.cloud/ipfs/${invoiceCid}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary transition hover:text-primary/80"
                        >
                          View Invoice
                        </a>
                      )}
                      {pastDeadline && (
                        <span className="text-amber-400">Past deadline</span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {status === "verified" && (
                        <button
                          onClick={() => void releaseFunds(trade)}
                          className="rounded-lg border border-green-500/50 bg-green-600/20 px-4 py-2 font-medium text-green-400 transition hover:bg-green-600/30"
                        >
                          Release Funds
                        </button>
                      )}
                      {(status === "awaitingShipment" || status === "inTransit") && (
                        <button
                          onClick={() => void openDispute(trade)}
                          className="rounded-lg border border-red-500/50 bg-red-600/20 px-4 py-2 font-medium text-red-400 transition hover:bg-red-600/30"
                        >
                          Open Dispute
                        </button>
                      )}
                      {status === "awaitingShipment" && pastDeadline && (
                        <button
                          onClick={() => void cancelTrade(trade)}
                          className="rounded-lg border border-border bg-card px-4 py-2 font-medium text-muted-foreground transition hover:bg-card/80"
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

export default function TradesPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading trade details…</p>
      </main>
    }>
      <TradesPageContent />
    </Suspense>
  );
}
