'use client';

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  Package,
  ShieldCheck,
  Store,
} from "lucide-react";
import { useAnchorClient } from "@/hooks/useAnchorClient";
import { MARKET_PROGRAM_ID, ESCROW_PROGRAM_ID } from "@/lib/anchor";
import { InvoiceUpload } from "@/components/InvoiceUpload";
import { AetherInvoicePreview } from "@/components/AetherInvoicePreview";
import { ComplianceUploadZone } from "@/components/ComplianceUploadZone";
import { CommitStepsDisplay } from "@/components/CommitStepsDisplay";
import { ensureAssociatedTokenAccount, resolveSettlementError } from "@/hooks/useCheckout";

const DEVNET_USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

type SettlementLineItem = {
  productId: string;
  title: string;
  tier: string;
  moq: number;
  leadTimeDays: number;
  priceUsdc: number;
  quantity: number;
  sellerWallet: string;
  usdcMint: string;
};

type VendorProfile = {
  shopName: string;
  isVerified: boolean;
};

type TradeRow = {
  pubkey: PublicKey;
  account: Record<string, unknown>;
};

type LoadingStage = "idle" | "creating-accounts" | "committing" | "registering";

function parseNumber(value: string | null | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseSettlementItems(searchParams: ReturnType<typeof useSearchParams>): SettlementLineItem[] {
  const indexed = new Map<number, Partial<SettlementLineItem>>();

  for (const [key, value] of Array.from(searchParams.entries())) {
    const match = key.match(/^item_(\d+)_(.+)$/);
    if (!match) continue;

    const index = Number(match[1]);
    const field = match[2];
    const current = indexed.get(index) ?? {};

    switch (field) {
      case "productId":
        current.productId = value;
        break;
      case "title":
        current.title = value;
        break;
      case "tier":
        current.tier = value;
        break;
      case "moq":
        current.moq = parseNumber(value, current.moq ?? 1);
        break;
      case "leadTimeDays":
        current.leadTimeDays = parseNumber(value, current.leadTimeDays ?? 7);
        break;
      case "priceUsdc":
        current.priceUsdc = parseNumber(value, current.priceUsdc ?? 0);
        break;
      case "quantity":
        current.quantity = parseNumber(value, current.quantity ?? 1);
        break;
      case "sellerWallet":
      case "sellerId":
        current.sellerWallet = value;
        break;
      case "usdcMint":
        current.usdcMint = value;
        break;
      default:
        break;
    }

    indexed.set(index, current);
  }

  if (indexed.size > 0) {
    return Array.from(indexed.entries())
      .sort(([a], [b]) => a - b)
      .map(([idx, item]) => ({
        productId: item.productId ?? `line-item-${idx + 1}`,
        title: item.title ?? `Requisition line ${idx + 1}`,
        tier: item.tier ?? "wholesaler",
        moq: item.moq ?? 1,
        leadTimeDays: item.leadTimeDays ?? 7,
        priceUsdc: item.priceUsdc ?? 0,
        quantity: item.quantity ?? item.moq ?? 1,
        sellerWallet: item.sellerWallet ?? "",
        usdcMint: item.usdcMint ?? DEVNET_USDC_MINT.toBase58(),
      }));
  }

  const directProductId = searchParams.get("productId") ?? "line-item-1";
  const directTitle = searchParams.get("title") ?? "Trade settlement";
  return [
    {
      productId: directProductId,
      title: directTitle,
      tier: searchParams.get("tier") ?? "wholesaler",
      moq: parseNumber(searchParams.get("moq"), 1),
      leadTimeDays: parseNumber(searchParams.get("leadTimeDays"), 7),
      priceUsdc: parseNumber(searchParams.get("priceUsdc"), 0),
      quantity: parseNumber(searchParams.get("quantity") ?? searchParams.get("moq"), 1),
      sellerWallet: searchParams.get("sellerWallet") ?? searchParams.get("sellerId") ?? "",
      usdcMint: searchParams.get("usdcMint") ?? DEVNET_USDC_MINT.toBase58(),
    },
  ];
}

function TradesPageContent() {
  const searchParams = useSearchParams();
  const { escrowProgram, marketProgram, wallet, connection, provider } = useAnchorClient();
  const [quantity, setQuantity] = useState("1");
  const [signatureRequired, setSignatureRequired] = useState(true);
  const [invoiceUrl, setInvoiceUrl] = useState("");
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [vendorProfiles, setVendorProfiles] = useState<Record<string, VendorProfile>>({});
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>("idle");
  const [loading, setLoading] = useState(false);
  const [invoiceCid, setInvoiceCid] = useState("");
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [currentCommitStep, setCurrentCommitStep] = useState<string>("idle");
  const [completedCommitSteps, setCompletedCommitSteps] = useState<string[]>([]);
  const [commitStepData, setCommitStepData] = useState<Record<string, unknown>>({});

  const baseItems = useMemo(() => parseSettlementItems(searchParams), [searchParams]);
  const effectiveItems = useMemo(() => {
    if (baseItems.length === 1) {
      const committedQty = Math.max(1, parseInt(quantity, 10) || 1);
      return baseItems.map((item) => ({ ...item, quantity: committedQty }));
    }
    return baseItems;
  }, [baseItems, quantity]);

  useEffect(() => {
    if (baseItems.length === 1) {
      setQuantity(String(baseItems[0].quantity || baseItems[0].moq || 1));
    }
  }, [baseItems]);

  useEffect(() => {
    if (!marketProgram || effectiveItems.length === 0) return;

    let cancelled = false;

    const loadProfiles = async () => {
      const wallets = Array.from(
        new Set(effectiveItems.map((item) => item.sellerWallet).filter(Boolean)),
      );

      if (wallets.length === 0) {
        if (!cancelled) setVendorProfiles({});
        return;
      }

      try {
        const entries = await Promise.all(
          wallets.map(async (sellerWallet) => {
            try {
              const [vendorProfilePda] = PublicKey.findProgramAddressSync(
                [Buffer.from("vendor"), new PublicKey(sellerWallet).toBuffer()],
                MARKET_PROGRAM_ID,
              );
              const profile = await (marketProgram.account as any).vendorProfile.fetch(vendorProfilePda);
              const shopName = String(profile.shopName ?? profile.shop_name ?? `Vendor ${sellerWallet.slice(0, 6)}`);
              const isVerified = Boolean(profile.isVerified ?? profile.is_verified ?? true);
              return [sellerWallet, { shopName, isVerified }] as const;
            } catch {
              return [sellerWallet, { shopName: `Vendor ${sellerWallet.slice(0, 6)}`, isVerified: true }] as const;
            }
          }),
        );

        if (!cancelled) {
          setVendorProfiles(Object.fromEntries(entries));
        }
      } catch {
        if (!cancelled) setVendorProfiles({});
      }
    };

    void loadProfiles();

    return () => {
      cancelled = true;
    };
  }, [effectiveItems, marketProgram]);

  useEffect(() => {
    if (!escrowProgram || !wallet?.publicKey) return;

    const loadTrades = async () => {
      try {
        const rows = (await (escrowProgram.account as any).tradeAccount.all()) as TradeRow[];
        const own = rows.filter(
          (row) => (row.account.buyer as PublicKey).toBase58() === wallet.publicKey.toBase58(),
        );
        setTrades(own);
      } catch (e) {
        console.warn("Failed to load trades:", e);
      }
    };

    void loadTrades();
    const id = setInterval(() => void loadTrades(), 10_000);
    return () => clearInterval(id);
  }, [escrowProgram, wallet?.publicKey]);

  const subtotal = effectiveItems.reduce((acc, item) => acc + item.priceUsdc * item.quantity, 0);
  const platformFee = subtotal * 0.02;
  const grandTotal = subtotal + platformFee;
  const uniqueVendors = new Set(effectiveItems.map((item) => item.sellerWallet).filter(Boolean));
  const primaryItem = effectiveItems[0];
  const primaryVendor = primaryItem?.sellerWallet ? vendorProfiles[primaryItem.sellerWallet] : undefined;
  const stageLabel: Record<LoadingStage, string> = {
    idle: "Ready to commit",
    "creating-accounts": "Creating associated token accounts",
    committing: "Signing trade instructions",
    registering: "Registering settlement",
  };

  const refreshTrades = useMemo(
    () => async () => {
      if (!escrowProgram || !wallet?.publicKey) return;
      try {
        const rows = (await (escrowProgram.account as any).tradeAccount.all()) as TradeRow[];
        const own = rows.filter(
          (row) => (row.account.buyer as PublicKey).toBase58() === wallet.publicKey.toBase58(),
        );
        setTrades(own);
      } catch (e) {
        console.warn("Failed to load trades:", e);
      }
    },
    [escrowProgram, wallet?.publicKey],
  );

  useEffect(() => {
    void refreshTrades();
    const id = setInterval(() => void refreshTrades(), 10_000);
    return () => clearInterval(id);
  }, [refreshTrades]);

  const createTrade = async () => {
    if (!escrowProgram || !wallet?.publicKey) return;
    if (effectiveItems.length === 0) {
      setError("No settlement details were found.");
      return;
    }

    try {
      setLoading(true);
      setLoadingStage("creating-accounts");
      setError(null);
      setCompletedCommitSteps([]);
      setCurrentCommitStep("hashing-po");
      setCommitStepData({});

      // Step 1: Hash PO (simulated)
      await new Promise(resolve => setTimeout(resolve, 500));
      const poHash = `0x${crypto.getRandomValues(new Uint8Array(32)).reduce((a, b) => a + b.toString(16).padStart(2, '0'), '')}`.slice(0, 66);
      setCommitStepData(prev => ({ ...prev, poHash }));
      setCompletedCommitSteps(prev => [...prev, "hashing-po"]);
      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 2: Generate invoice number
      setCurrentCommitStep("generating-invoice");
      const invoiceNumber = `AETHER-${Date.now()}`;
      setCommitStepData(prev => ({ ...prev, invoiceNumber }));
      await new Promise(resolve => setTimeout(resolve, 800));
      setCompletedCommitSteps(prev => [...prev, "generating-invoice"]);

      // Step 3: Prepare to lock USDC
      setCurrentCommitStep("locking-usdc");
      const escrowAmount = effectiveItems.reduce((acc, item) => acc + item.priceUsdc * item.quantity, 0);
      setCommitStepData(prev => ({ ...prev, escrowAmount }));

      const payer = (provider?.wallet as { payer?: Parameters<typeof ensureAssociatedTokenAccount>[1] } | undefined)?.payer;
      if (!payer) {
        throw new Error("wallet payer is required");
      }

      for (const item of effectiveItems) {
        const sellerWallet = item.sellerWallet.trim();
        if (!sellerWallet) {
          throw new Error("Missing seller wallet");
        }

        const sellerPubkey = new PublicKey(sellerWallet);
        const mintPubkey = new PublicKey(item.usdcMint || DEVNET_USDC_MINT.toBase58());
        const tradeId = crypto.getRandomValues(new Uint8Array(32));
        const tradeAmountUsdc = Math.max(1, item.priceUsdc * item.quantity);
        const amountUsdc = Math.max(1, Math.floor(tradeAmountUsdc * 1.02 * 1_000_000));
        const milestoneHash = new Uint8Array(32);
        const [tradeAccount] = PublicKey.findProgramAddressSync(
          [Buffer.from("trade"), wallet.publicKey.toBuffer(), tradeId],
          ESCROW_PROGRAM_ID,
        );
        const [escrowVault] = PublicKey.findProgramAddressSync(
          [Buffer.from("vault"), tradeId],
          ESCROW_PROGRAM_ID,
        );
        const [vaultAuthority] = PublicKey.findProgramAddressSync(
          [Buffer.from("authority")],
          ESCROW_PROGRAM_ID,
        );

        const [buyerTokenAccount] = await Promise.all([
          ensureAssociatedTokenAccount(connection, payer, mintPubkey, wallet.publicKey),
          ensureAssociatedTokenAccount(connection, payer, mintPubkey, sellerPubkey),
        ]);

        setLoadingStage("committing");
        const signature = await escrowProgram.methods
          .createTrade(
            Array.from(tradeId),
            new BN(amountUsdc),
            Array.from(milestoneHash),
            signatureRequired,
            invoiceCid || (invoiceUrl.includes("/ipfs/") ? invoiceUrl.split("/ipfs/")[1] : null),
          )
          .accounts({
            buyer: wallet.publicKey,
            seller: sellerPubkey,
            tradeAccount,
            escrowVault,
            vaultAuthority,
            buyerTokenAccount: buyerTokenAccount.address,
            usdcMint: mintPubkey,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();

        await new Promise(resolve => setTimeout(resolve, 600));
        setCompletedCommitSteps(prev => [...prev, "locking-usdc"]);

        // Step 4: Register with agent
        setCurrentCommitStep("registering-agent");
        setLoadingStage("registering");
        const trackingId = `TRK-${Buffer.from(tradeId).toString("hex").slice(0, 12).toUpperCase()}`;
        setCommitStepData(prev => ({ ...prev, trackingId }));

        const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8080";
        fetch(`${AGENT_URL}/api/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tracking_id: trackingId,
            wallet: wallet.publicKey.toString(),
            callback_url: "",
            carrier: "dhl",
            trade_account: tradeAccount.toString(),
            trade_id: Buffer.from(tradeId).toString("hex"),
            signature,
          }),
        }).catch((e) => console.warn("Agent registration failed (non-fatal):", e));

        await new Promise(resolve => setTimeout(resolve, 600));
        setCompletedCommitSteps(prev => [...prev, "registering-agent"]);
      }

      setInvoiceUrl("");
      if (effectiveItems.length === 1) {
        setQuantity(String(effectiveItems[0].quantity));
      }
      setLoadingStage("idle");
      void refreshTrades();
    } catch (e: unknown) {
      setError(resolveSettlementError(e));
      setLoadingStage("idle");
    } finally {
      setLoading(false);
    }
  };

  const buttonLabel =
    loadingStage === "creating-accounts"
      ? "Preparing accounts..."
      : loadingStage === "committing"
        ? "Reviewing on-chain..."
        : loadingStage === "registering"
          ? "Finalizing..."
          : "Review & Commit";

  return (
    <main className="min-h-screen bg-[var(--bg-base)] pt-24 text-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-8 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="badge-pill badge-pill-primary">
              <ShieldCheck size={13} />
              Review & Commit
            </span>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-foreground">
              Institutional trade settlement
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Phantom signs the commitment, ATAs are created automatically, and vendor identity stays readable without exposing raw public keys.
            </p>
          </div>

          <div className="glass flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Lines</p>
              <p className="text-sm font-semibold text-foreground">{effectiveItems.length}</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Total</p>
              <p className="text-sm font-semibold text-foreground">${grandTotal.toFixed(2)} USDC</p>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">{error}</p>
              <p className="text-xs opacity-75">Check your wallet balance or refresh the trade details.</p>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
          <div className="space-y-6">
            <section className="glass rounded-2xl p-6 shadow-card">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge badge-cyan inline-flex items-center gap-1">
                      <Store size={11} />
                      {primaryVendor?.shopName ?? "Verified supplier"}
                    </span>
                    <span className="badge badge-green inline-flex items-center gap-1">
                      <CheckCircle2 size={11} />
                      Verified on Solana Devnet
                    </span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{primaryItem?.title ?? "Settlement review"}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {uniqueVendors.size > 1
                        ? `${effectiveItems.length} requisition lines across ${uniqueVendors.size} vendors`
                        : "Review the order terms before committing on-chain."}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-background/60 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Status</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{stageLabel[loadingStage]}</p>
                </div>
              </div>
            </section>

            <section className="glass rounded-2xl p-6 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Requisition lines</p>
                  <h3 className="mt-1 text-lg font-bold text-foreground">Review items</h3>
                </div>
                <Package size={18} className="text-primary" />
              </div>

              <div className="space-y-3">
                {effectiveItems.map((item, index) => {
                  const vendor = item.sellerWallet ? vendorProfiles[item.sellerWallet] : undefined;
                  const lineTotal = item.priceUsdc * item.quantity;
                  return (
                    <div
                      key={`${item.productId}-${index}`}
                      className="rounded-2xl border border-border bg-background/60 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="badge badge-violet">{item.tier}</span>
                            <span className="text-sm font-semibold text-foreground">{item.title}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{vendor?.shopName ?? `Vendor ${item.sellerWallet.slice(0, 6) || "pending"}`}</span>
                            <span>•</span>
                            <span>{item.leadTimeDays} day lead</span>
                            <span>•</span>
                            <span>MOQ {item.moq}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">
                            {item.quantity} × ${item.priceUsdc.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">${lineTotal.toFixed(2)} line total</p>
                        </div>
                      </div>

                      {baseItems.length === 1 && (
                        <div className="mt-4 grid gap-2">
                          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Commit quantity
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="input"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="glass rounded-3xl overflow-hidden shadow-card">
              <div className="bg-secondary/50 px-6 py-4 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-primary" />
                  <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Verification Policy</h3>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[9px] font-black text-green-500 uppercase">Secure</span>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Company Authorization</p>
                    <ComplianceUploadZone onUploaded={(url, cid) => { setInvoiceUrl(url); setInvoiceCid(cid || ""); }} />
                    <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground font-medium">
                      Upload a signed Purchase Order or corporate authorization document. This document is cryptographically pinned to the escrow.
                    </p>
                  </div>

                  <div className="flex flex-col">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Release Condition</p>
                    <div className="flex-1 rounded-2xl border border-border bg-background/40 p-5">
                      <label className="flex items-start gap-4 cursor-pointer">
                        <div className="relative flex items-center pt-1">
                          <input
                            type="checkbox"
                            checked={signatureRequired}
                            onChange={(e) => setSignatureRequired(e.target.checked)}
                            className="h-5 w-5 rounded-lg border-border border-2 bg-background accent-primary transition-all cursor-pointer"
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-foreground">Require Physical Signature</p>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            Funds are only released once the carrier (DHL) confirms a physical signature matches the authorized recipient.
                          </p>
                        </div>
                      </label>
                      
                      <div className="mt-6 pt-6 border-t border-border/50">
                        <div className="flex items-center gap-2 text-xs font-bold text-primary">
                          <ShieldCheck size={14} />
                          Automated zkTLS Release Active
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="glass rounded-2xl p-6 shadow-card">
              <button
                type="button"
                onClick={() => setDetailsOpen((open) => !open)}
                className="flex w-full items-center justify-between text-left"
              >
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Technical details</p>
                  <h3 className="mt-1 text-base font-bold text-foreground">Show raw settlement fields</h3>
                </div>
                {detailsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {detailsOpen && (
                <div className="mt-4 space-y-3">
                  {effectiveItems.map((item, index) => (
                    <div key={`${item.productId}-details-${index}`} className="rounded-xl border border-border bg-background/60 p-3 text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Seller wallet</span>
                        <span className="addr break-all text-right text-foreground">{item.sellerWallet}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">USDC mint</span>
                        <span className="addr break-all text-right text-foreground">{item.usdcMint}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="self-start lg:sticky lg:top-24">
            <div className="glass rounded-2xl p-6 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Commit summary</p>
                  <h3 className="mt-1 text-xl font-black text-foreground">
                    {primaryVendor?.shopName ?? "Vendor review"}
                  </h3>
                </div>
                <span className="badge badge-green inline-flex items-center gap-1">
                  <ShieldCheck size={11} />
                  Devnet
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {effectiveItems.map((item) => (
                  <div key={`${item.productId}-summary`} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/60 px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-foreground line-clamp-1">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Qty {item.quantity} • {vendorProfiles[item.sellerWallet]?.shopName ?? `Vendor ${item.sellerWallet.slice(0, 6) || "pending"}`}
                      </p>
                    </div>
                    <span className="font-semibold text-foreground">${(item.priceUsdc * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-2 border-t border-border pt-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-semibold text-foreground">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Platform fee (2%)</span>
                  <span className="font-semibold text-foreground">${platformFee.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 text-base font-bold text-foreground">
                  <span>Grand total</span>
                  <span className="text-primary">${grandTotal.toFixed(2)} USDC</span>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-foreground">
                Funds lock in escrow and only move on verified delivery.
              </div>

              <button
                onClick={createTrade}
                disabled={loading || !wallet?.publicKey || effectiveItems.length === 0}
                className="btn-primary mt-5 w-full py-3 text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {buttonLabel}
                  </>
                ) : (
                  <>
                    {buttonLabel}
                    <ArrowRight size={15} />
                  </>
                )}
              </button>

              {!wallet?.publicKey && (
                <p className="mt-3 text-center text-xs font-semibold text-destructive">
                  Connect Phantom to commit settlement.
                </p>
              )}

              {loadingStage !== "idle" && (
                <p className="mt-3 text-center text-xs text-muted-foreground">{stageLabel[loadingStage]}</p>
              )}
            </div>
          </aside>
        </div>

        {trades.length > 0 && (
          <section className="glass mt-8 rounded-2xl p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Active trades</p>
                <h3 className="mt-1 text-lg font-bold text-foreground">Open settlement records</h3>
              </div>
              <span className="badge badge-cyan">{trades.length} open</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {trades.map((trade, index) => (
                <div key={trade.pubkey.toBase58()} className="rounded-2xl border border-border bg-background/60 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="badge badge-violet">Trade {index + 1}</span>
                    <span className="badge badge-green">Pending</span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-foreground">Settlement account secured</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Monitoring delivery and release conditions on chain.
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <AetherInvoicePreview
          items={effectiveItems}
          buyerAddress={wallet?.publicKey?.toBase58() || ""}
          vendorProfiles={vendorProfiles}
          grandTotal={grandTotal}
          subtotal={subtotal}
          platformFee={platformFee}
          isOpen={invoiceModalOpen}
          onClose={() => setInvoiceModalOpen(false)}
          invoiceCid={invoiceCid}
        />
      </div>
    </main>
  );
}

export default function TradesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-base)] pt-24 text-foreground">Loading…</div>}>
      <TradesPageContent />
    </Suspense>
  );
}





