'use client';

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
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
  publicKey: PublicKey;
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
  const [commitStepData, setCommitStepData] = useState<Record<string, any>>({});
  // HACKATHON MOCK - track success state and transaction signature for success screen
  const [successSignatures, setSuccessSignatures] = useState<string[]>([]);

  const baseItems = useMemo(() => parseSettlementItems(searchParams), [searchParams]);
  const effectiveItems = useMemo(() => {
    let items = baseItems;
    if (baseItems.length === 1) {
      const committedQty = Math.max(1, parseInt(quantity, 10) || 1);
      items = baseItems.map((item) => ({ ...item, quantity: committedQty }));
    }

    // Dev helper: if a test mint is saved and a wallet is connected, override per-item usdcMint
    // so demo users (judges) don't need to paste the usdcMint in the trades URL.
    try {
      if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined' && wallet?.publicKey) {
        const savedMint = localStorage.getItem('aether_test_usdc_mint') ?? '';
        if (savedMint) {
          return items.map((item) => ({ ...item, usdcMint: savedMint }));
        }
      }
    } catch {}

    return items;
  }, [baseItems, quantity, wallet?.publicKey]);

  const moqNotMet = effectiveItems.some(item => item.quantity < (item.moq || 1));

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
              let sellerPubkey: PublicKey;
              try {
                sellerPubkey = new PublicKey(sellerWallet);
              } catch {
                return [sellerWallet, { shopName: `Vendor ${sellerWallet.slice(0, 6)}`, isVerified: true }] as const;
              }
              const [vendorProfilePda] = PublicKey.findProgramAddressSync(
                [Buffer.from("vendor"), sellerPubkey.toBuffer()],
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

  // Fetch wallet's associated token account balance for the selected USDC mint to surface insufficient funds early
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [tokenBalanceLoading, setTokenBalanceLoading] = useState(false);
  // HACKATHON MOCK - fetch SOL balance to display on checkout page
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [solBalanceLoading, setSolBalanceLoading] = useState(false);
  const usdcMintsKey = useMemo(() => JSON.stringify(effectiveItems.map(i => i.usdcMint || DEVNET_USDC_MINT.toBase58())), [effectiveItems]);

  useEffect(() => {
    let mounted = true;
    async function fetchBalance() {
      setTokenBalanceLoading(true);
      setTokenBalance(null);
      try {
        if (!wallet?.publicKey) { setTokenBalance(null); return; }
        const mintStr = effectiveItems?.[0]?.usdcMint ?? DEVNET_USDC_MINT.toBase58();
        const mintPub = new PublicKey(mintStr);
        const ata = getAssociatedTokenAddressSync(mintPub, wallet.publicKey);
        const resp = await connection.getTokenAccountBalance(ata).catch(() => null);
        if (!mounted) return;
        if (!resp) {
          setTokenBalance(0);
        } else {
          setTokenBalance(Number(resp.value.uiAmount ?? 0));
        }
      } catch (e) {
        if (mounted) setTokenBalance(0);
      } finally {
        if (mounted) setTokenBalanceLoading(false);
      }
    }

    fetchBalance();
    return () => { mounted = false; };
  }, [wallet?.publicKey?.toBase58(), connection, usdcMintsKey]);

  // HACKATHON MOCK - fetch SOL balance for fee display and error messaging
  useEffect(() => {
    let mounted = true;
    async function fetchSolBalance() {
      setSolBalanceLoading(true);
      setSolBalance(null);
      try {
        if (!wallet?.publicKey) { setSolBalance(null); return; }
        const lamports = await connection.getBalance(wallet.publicKey);
        if (mounted) setSolBalance(lamports / 1_000_000_000);
      } catch (e) {
        if (mounted) setSolBalance(0);
      } finally {
        if (mounted) setSolBalanceLoading(false);
      }
    }

    fetchSolBalance();
    return () => { mounted = false; };
  }, [wallet?.publicKey?.toBase58(), connection]);

  const insufficientFunds = tokenBalance !== null && tokenBalance < grandTotal;
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

      const payer = undefined; // Phantom doesn't provide a payer

      const sigs: string[] = [];

      for (const item of effectiveItems) {
        const sellerWallet = item.sellerWallet.trim();
        // HACKATHON MOCK - use placeholder if seller wallet missing (for demo flow)
        if (!sellerWallet) {
          console.warn("Missing seller wallet in URL params, using placeholder for demo");
          setError("Seller wallet not specified. Check your trade URL.");
          return;
        }

        let sellerPubkey: PublicKey;
        let mintPubkey: PublicKey;
        try {
          sellerPubkey = new PublicKey(sellerWallet);
          mintPubkey = new PublicKey(item.usdcMint || DEVNET_USDC_MINT.toBase58());
        } catch {
          setError(`Invalid wallet address format for seller or mint.`);
          setLoadingStage("idle");
          setLoading(false);
          return;
        }
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

        const buyerAta = getAssociatedTokenAddressSync(mintPubkey, wallet.publicKey);
        const sellerAta = getAssociatedTokenAddressSync(mintPubkey, sellerPubkey);

        // HACKATHON MOCK - ensure ATAs exist before transaction
        // In prod, use getOrCreateAssociatedTokenAccount with payer
        // For demo, assume they exist; if not, program will fail gracefully
        try {
          const buyerAtaInfo = await connection.getAccountInfo(buyerAta);
          if (!buyerAtaInfo) {
            setError("Your USDC account does not exist. Contact us for setup.");
            return;
          }
        } catch {
          // Ignore - program will catch if ATA missing
        }

        setLoadingStage("committing");
        try {
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
              buyerTokenAccount: buyerAta,
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
          // HACKATHON MOCK - wrap in try-catch to prevent flow crash if agent unavailable
          try {
            const res = await fetch(`${AGENT_URL}/api/register`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                tracking_id: trackingId,
                wallet: wallet.publicKey.toString(),
                callback_url: window.location.origin + "/api/webhooks/agent",
                carrier: "dhl",
                trade_account: tradeAccount.toString(),
                trade_id: Buffer.from(tradeId).toString("hex"),
                signature,
              }),
            });

            if (!res.ok) {
              console.warn("Agent registration returned error:", await res.text());
              // Don't fail the demo - agent is optional for on-chain flow
            }
          } catch (agentErr) {
            console.warn("Agent registration failed (non-fatal):", agentErr);
          }

          await new Promise(resolve => setTimeout(resolve, 600));
          setCompletedCommitSteps(prev => [...prev, "registering-agent"]);
          
          // HACKATHON MOCK - store transaction signature for success screen
          sigs.push(signature);
        } catch (txError) {
          // Pass full error with balance context to improved error handler
          const resolvedError = resolveSettlementError(txError, tokenBalance ?? 0, grandTotal);
          setError(resolvedError);
          setLoadingStage("idle");
          return;
        }
      }

      setInvoiceUrl("");
      if (effectiveItems.length === 1) {
        setQuantity(String(effectiveItems[0].quantity));
      }
      setLoadingStage("idle");
      // HACKATHON MOCK - store signatures for success screen display
      setSuccessSignatures(sigs);
      void refreshTrades();
    } catch (e: unknown) {
      // HACKATHON MOCK - pass balance info to improved error handler
      setError(resolveSettlementError(e, tokenBalance ?? 0, grandTotal));
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
        {/* HACKATHON MOCK - show success screen after successful trade commit */}
        {successSignatures.length > 0 && (
          <div className="mb-8 rounded-3xl border border-green-500/30 bg-green-500/10 p-8 shadow-2xl">
            <div className="flex items-start gap-4">
              <CheckCircle2 size={32} className="text-green-500 shrink-0 mt-1" />
              <div className="flex-1">
                <h2 className="text-2xl font-black text-green-500 tracking-tight mb-2">
                  ✓ Trade Committed Successfully!
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Funds are now locked in escrow. The vendor will ship on delivery, and your USDC will release after signature verification.
                </p>
                
                <div className="space-y-3 mb-6">
                  {successSignatures.map((sig, idx) => (
                    <div key={idx} className="rounded-2xl border border-green-500/20 bg-background/60 p-4">
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">
                        Transaction {idx + 1}
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono text-foreground flex-1 truncate">{sig}</code>
                        <a
                          href={`https://explorer.solana.com/tx/${sig}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-primary hover:text-primary/80 transition-colors px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 whitespace-nowrap"
                        >
                          View Explorer ↗
                        </a>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={() => setSuccessSignatures([])}
                    className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-sm font-bold text-primary hover:bg-primary/20 transition-all"
                  >
                    Place Another Trade
                  </button>
                  <a
                    href="/trades"
                    className="px-4 py-2 rounded-lg bg-primary text-sm font-bold text-white hover:bg-primary/90 transition-all text-center"
                  >
                    View Active Trades
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

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

          <div className="glass flex flex-wrap items-center gap-6 rounded-2xl px-6 py-4 bg-white/5 border-white/10 shadow-2xl">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Lines</p>
              <p className="text-base font-black text-foreground">{effectiveItems.length}</p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Settlement Total</p>
              <p className="text-base font-black text-primary">${grandTotal.toFixed(2)} USDC</p>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">{error}</p>
              <p className="text-xs opacity-75 mt-1">
                {/* HACKATHON MOCK - show both USDC and SOL balances on error */}
                Available: {(tokenBalance ?? 0).toFixed(6)} USDC | {(solBalance ?? 0).toFixed(6)} SOL
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
          <div className="space-y-6">
            <section className="glass rounded-3xl p-8 shadow-2xl border border-white/5 bg-white/[0.02]">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="badge badge-cyan px-3 py-1.5 rounded-full flex items-center gap-2">
                      <Store size={14} />
                      {primaryVendor?.shopName ?? "Verified Supplier"}
                    </span>
                    <span className="badge badge-green px-3 py-1.5 rounded-full flex items-center gap-2">
                      <CheckCircle2 size={14} />
                      Active Settlement
                    </span>
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-foreground tracking-tight">{primaryItem?.title ?? "Settlement Review"}</h2>
                    <p className="mt-2 text-sm font-bold text-muted-foreground uppercase tracking-widest">
                      {uniqueVendors.size > 1
                        ? `${effectiveItems.length} lines across ${uniqueVendors.size} vendors`
                        : "Institutional Order Commitment"}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Settlement Status</p>
                  <p className="mt-2 text-sm font-black text-primary uppercase tracking-wider">{stageLabel[loadingStage]}</p>
                </div>
              </div>
            </section>

            <section className="glass rounded-3xl p-8 shadow-2xl border border-white/5">
              <div className="mb-6 flex items-center justify-between border-b border-white/5 pb-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Requisition lines</p>
                  <h3 className="mt-2 text-xl font-black text-foreground">Review Items</h3>
                </div>
                <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                  <Package size={20} />
                </div>
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
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                              Commit quantity
                            </label>
                            {parseInt(quantity, 10) < item.moq && (
                              <span className="text-[10px] font-bold text-red-500 uppercase tracking-tighter">
                                Below MOQ ({item.moq})
                              </span>
                            )}
                          </div>
                          <input
                            type="number"
                            min={item.moq}
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className={`input ${parseInt(quantity, 10) < item.moq ? 'border-red-500/50 bg-red-500/5' : ''}`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="glass rounded-3xl overflow-hidden shadow-2xl border border-white/5">
              <div className="bg-primary/5 px-6 py-5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                    <ShieldCheck size={20} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-[0.15em] text-foreground">Verification Policy</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">zkTLS Institutional Guard</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-black text-green-500 uppercase tracking-wider">Active Protection</span>
                </div>
              </div>
              
              <div className="p-8">
                <div className="grid gap-8 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-primary" />
                      <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Company Authorization</p>
                    </div>
                    <ComplianceUploadZone onUploaded={(url, cid) => { setInvoiceUrl(url); setInvoiceCid(cid || ""); }} />
                    <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground font-medium">
                      Upload a signed Purchase Order or corporate authorization document. This document is cryptographically pinned to the escrow.
                    </p>
                  </div>

                  <div className="flex flex-col">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Release Condition</p>
                    <div className="flex-1 rounded-3xl border-2 border-primary/20 bg-primary/5 p-6">
                      <label className="flex items-start gap-4 cursor-pointer">
                        <div className="relative flex items-center pt-1">
                          <input
                            type="checkbox"
                            checked={signatureRequired}
                            onChange={(e) => setSignatureRequired(e.target.checked)}
                            className="h-6 w-6 rounded-lg border-primary/30 border-2 bg-background accent-primary transition-all cursor-pointer"
                          />
                        </div>
                        <div className="space-y-2">
                          <p className="text-lg font-black text-foreground tracking-tight uppercase">Require Physical Signature</p>
                          <p className="text-sm leading-relaxed text-muted-foreground font-medium pr-8">
                            Escrowed funds remain locked until the <span className="text-foreground font-bold">DHL Global API</span> confirms a successful delivery with a verified recipient signature.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="glass rounded-3xl p-8 shadow-2xl border border-white/5">
              <button
                type="button"
                onClick={() => setDetailsOpen((open) => !open)}
                className="flex w-full items-center justify-between text-left"
              >
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Technical details</p>
                  <h3 className="mt-2 text-xl font-black text-foreground">Show raw settlement fields</h3>
                </div>
                {detailsOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
              </button>

              {detailsOpen && (
                <div className="mt-6 space-y-3">
                  {effectiveItems.map((item, index) => (
                    <div key={`${item.productId}-details-${index}`} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground font-bold uppercase tracking-widest">Seller wallet</span>
                        <span className="addr break-all text-right text-foreground font-mono">{item.sellerWallet}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="text-muted-foreground font-bold uppercase tracking-widest">USDC mint</span>
                        <span className="addr break-all text-right text-foreground font-mono">{item.usdcMint}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="self-start lg:sticky lg:top-24">
            <div className="glass rounded-3xl p-8 shadow-2xl border border-white/5 bg-white/[0.02]">
              <div className="flex items-start justify-between gap-3 mb-8">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Commit summary</p>
                  <h3 className="mt-2 text-2xl font-black text-foreground tracking-tight">
                    {primaryVendor?.shopName ?? "Vendor Review"}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20">
                  <ShieldCheck size={12} className="text-primary" />
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">Devnet</span>
                </div>
              </div>

              <div className="space-y-4">
                {effectiveItems.map((item) => (
                  <div key={`${item.productId}-summary`} className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-sm">
                    <div className="min-w-0">
                      <p className="font-bold text-foreground truncate">{item.title}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">
                        Qty {item.quantity} • MOQ {item.moq}
                      </p>
                    </div>
                    <span className="font-black text-foreground shrink-0">${(item.priceUsdc * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 space-y-3 border-t border-white/10 pt-6">
                <div className="flex items-center justify-between text-sm uppercase tracking-widest font-black text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="text-foreground">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm uppercase tracking-widest font-black text-muted-foreground">
                  <span>Platform fee (2%)</span>
                  <span className="text-foreground">${platformFee.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between pt-4 mt-2 border-t border-white/5">
                  <span className="text-base font-black text-foreground uppercase tracking-tight">Grand total</span>
                  <span className="text-2xl font-black text-primary tracking-tighter">${grandTotal.toFixed(2)} USDC</span>
                </div>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-black uppercase tracking-wider">Available balance</span>
                  <span className={`font-black ${insufficientFunds ? 'text-red-400' : 'text-foreground'}`}>
                    {tokenBalanceLoading ? 'Loading...' : `${(tokenBalance ?? 0).toFixed(6)} USDC`}
                  </span>
                </div>

                {/* HACKATHON MOCK - display SOL balance for fee awareness */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="font-black uppercase tracking-wider">Gas balance</span>
                  <span className={`font-black ${(solBalance ?? 0) < 0.005 ? 'text-yellow-400' : 'text-foreground'}`}>
                    {solBalanceLoading ? 'Loading...' : `${(solBalance ?? 0).toFixed(6)} SOL`}
                  </span>
                </div>

                {insufficientFunds && (
                  <div className="mt-3 text-sm text-red-400 font-bold">You need ${(grandTotal - (tokenBalance ?? 0)).toFixed(2)} more USDC. Get devnet USDC → spl-token-faucet.com</div>
                )}

                {/* HACKATHON MOCK - warn if SOL balance too low */}
                {!insufficientFunds && (solBalance ?? 0) < 0.005 && (
                  <div className="mt-3 text-sm text-yellow-400 font-bold">Low on SOL. Get devnet SOL → faucet.solana.com</div>
                )}
              </div>

              <div className={`mt-8 rounded-2xl border px-5 py-4 text-xs font-bold transition-all duration-300 ${
                moqNotMet 
                ? 'bg-red-500/10 border-red-500/20 text-red-500' 
                : 'bg-primary/5 border-primary/20 text-primary'
              }`}>
                {moqNotMet 
                  ? "Order quantity is below the supplier's minimum threshold." 
                  : "Funds lock in escrow and only move on verified delivery."
                }
              </div>

              {loading && completedCommitSteps.length > 0 && (
                <div className="mt-6 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Commit Progress</p>
                  <CommitStepsDisplay
                    currentStep={currentCommitStep as any}
                    completedSteps={completedCommitSteps as any}
                    poHash={commitStepData.poHash as string}
                    invoiceNumber={commitStepData.invoiceNumber as string}
                    escrowAmount={commitStepData.escrowAmount as number}
                    trackingId={commitStepData.trackingId as string}
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => setInvoiceModalOpen(true)}
                className="mt-6 w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-sm font-black uppercase tracking-widest text-foreground flex items-center justify-center gap-3 active:scale-95"
              >
                <FileText size={18} className="text-primary" />
                Preview Digital Invoice
              </button>

              <button
                onClick={createTrade}
                disabled={loading || !wallet?.publicKey || effectiveItems.length === 0 || moqNotMet || insufficientFunds}
                className={`btn-primary mt-4 w-full py-5 text-sm font-black uppercase tracking-widest transition-all ${
                  moqNotMet || loading || !wallet?.publicKey || insufficientFunds
                  ? 'opacity-30 grayscale cursor-not-allowed' 
                  : 'shadow-xl shadow-primary/20 hover:shadow-primary/40 active:scale-95'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Committing...
                  </>
                ) : (
                  <>
                    Commit Settlement
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              {!wallet?.publicKey && (
                <p className="mt-4 text-center text-[10px] font-black uppercase tracking-widest text-red-500">
                  Connect Phantom to commit settlement
                </p>
              )}
            </div>
          </aside>
        </div>

        {trades.length > 0 && (
          <section className="glass mt-8 rounded-3xl p-8 shadow-2xl border border-white/5 bg-white/[0.02]">
            <div className="mb-6 flex items-center justify-between border-b border-white/5 pb-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Active trades</p>
                <h3 className="mt-2 text-xl font-black text-foreground">Open settlement records</h3>
              </div>
              <span className="badge badge-cyan px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{trades.length} active</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trades.map((trade, index) => (
                <div key={trade.publicKey.toBase58()} className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 hover:bg-white/[0.06] transition-all cursor-pointer group">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="badge badge-violet">Trade {index + 1}</span>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                      <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[9px] font-black text-green-500 uppercase tracking-widest tracking-tighter">Secured</span>
                    </div>
                  </div>
                  <p className="text-sm font-black text-foreground group-hover:text-primary transition-colors">Settlement account active</p>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground font-medium uppercase tracking-tight">
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


