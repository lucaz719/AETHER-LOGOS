"use client";

import { BorshAccountsCoder } from "@coral-xyz/anchor";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { BN } from "bn.js";
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { useTradeSync } from "@/context/TradeContext";
import { useAnchorClient } from "@/hooks/useAnchorClient";
import { MARKET_PROGRAM_ID, ESCROW_PROGRAM_ID, MARKETPLACE_PROGRAM_ID, USDC_MINT, PLATFORM_TREASURY_PUBKEY, TOKEN_PROGRAM_ID } from "@/lib/anchor";
import tradeEscrowIdl from "@/lib/idl/trade_escrow.json";
import {
  KeyRound, ShieldCheck, Scale, Wallet as WalletIcon, Gavel, Package, Truck,
  CheckCircle, ExternalLink, RefreshCw, Settings, Activity, AlertTriangle,
  TrendingUp, UserCheck, BookOpen, Landmark, X, ChevronRight, Layers,
  BarChart2, DollarSign, Percent, ArrowUpRight
} from "lucide-react";
import { fetchAgent } from "@/lib/agentApi";
import { AGENT_URL } from "@/lib/config";

type Tab = "init" | "verify" | "review" | "disputes" | "market" | "settlement" | "analytics";
const DEMO_ADMIN = process.env.NEXT_PUBLIC_ADMIN_WALLET ?? "";

function AdminConnectPrompt() {
  return (
    <main className="page-container" style={{ textAlign: "center", paddingTop: "4rem" }}>
      <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "center" }}>
        <KeyRound size={44} color="var(--text-secondary)" />
      </div>
      <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>Admin wallet required.</p>
      <WalletMultiButton />
    </main>
  );
}

function asBase58(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toBase58" in (value as Record<string, unknown>)) {
    const key = value as { toBase58?: () => string };
    if (typeof key.toBase58 === "function") {
      return key.toBase58();
    }
  }
  return null;
}

function asStringValue(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (value && typeof value === "object" && "toString" in (value as Record<string, unknown>)) {
    const rendered = String(value);
    return rendered === "[object Object]" ? null : rendered;
  }
  return null;
}

function asHex(value: unknown): string | null {
  if (value instanceof Uint8Array) {
    return Array.from(value).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  if (Array.isArray(value)) {
    return value.map((byte) => Number(byte).toString(16).padStart(2, "0")).join("");
  }
  return typeof value === "string" ? value : null;
}

function statusLabel(status: unknown): string {
  if (!status) return "AwaitingShipment";
  if (typeof status === "string") return status;
  if (typeof status === "object") {
    return Object.keys(status as Record<string, unknown>)[0] ?? "AwaitingShipment";
  }
  return "AwaitingShipment";
}

function patchIdl(idl: any): any {
  const seenNames = new Set<string>();

  const cleanTypes = (idl.types || []).map((t: any) => {
    seenNames.add(t.name);
    if (t.type?.kind) return t;
    return {
      name: t.name,
      type: { kind: "struct", fields: t.type?.fields || [] },
    };
  });

  const accountTypes = (idl.accounts || [])
    .filter((a: any) => !seenNames.has(a.name))
    .map((a: any) => ({
      name: a.name,
      type: { kind: "struct", fields: a.type?.fields || [] },
    }));

  return { ...idl, types: [...cleanTypes, ...accountTypes] };
}

const RAW_TRADE_CODER = new BorshAccountsCoder(patchIdl(tradeEscrowIdl));

function decodeTradeAccount(escrowProgram: NonNullable<ReturnType<typeof useAnchorClient>["escrowProgram"]>, data: Buffer) {
  try {
    return escrowProgram.coder.accounts.decode("TradeAccount", data);
  } catch {
    return escrowProgram.coder.accounts.decodeUnchecked("TradeAccount", data);
  }
}

function decodeRawTradeAccount(data: Buffer) {
  return RAW_TRADE_CODER.decode("TradeAccount", data) as Record<string, unknown>;
}

function normalizeAdminTrade(input: any): any | null {
  const account = input?.account ?? {};
  const tradeAccount = input?.trade_account ?? input?.pubkey ?? asBase58(input?.pubkey);
  if (typeof tradeAccount !== "string" || tradeAccount.length === 0) {
    return null;
  }

  const status = input?.status ?? account.status ?? "AwaitingShipment";
  const orderCreatedAt = asStringValue(account.orderCreatedAt ?? account.order_created_at);
  const createdAt =
    input?.created_at ??
    (orderCreatedAt ? new Date(Number(orderCreatedAt) * 1000).toISOString() : new Date().toISOString());

  return {
    id: tradeAccount,
    trade_id: input?.trade_id ?? asHex(account.tradeId ?? account.trade_id) ?? "unknown",
    wallet: input?.wallet ?? account.buyer ?? asBase58(account.buyer) ?? "unknown",
    seller: input?.seller ?? account.seller ?? asBase58(account.seller) ?? "unknown",
    amount: input?.amount ?? asStringValue(account.amount) ?? "0",
    tracking_id: input?.tracking_id ?? account.trackingId ?? account.tracking_id ?? "pending",
    carrier: input?.carrier ?? asStringValue(account.carrier) ?? "unknown",
    status,
    last_known_status: input?.last_known_status ?? statusLabel(status),
    created_at: createdAt,
    trade_account: tradeAccount,
  };
}

const SIDEBAR_GROUPS = [
  {
    label: "Protocol",
    items: [
      { id: "init" as Tab, label: "Protocol Settings", icon: Settings, description: "Manage on-chain MarketplaceConfig initialization" },
      { id: "verify" as Tab, label: "Vendor Desk", icon: UserCheck, description: "Review and approve vendor applications" },
      { id: "review" as Tab, label: "Moderation", icon: BookOpen, description: "Close abusive review accounts and return rent" },
    ],
  },
  {
    label: "Trade Ops",
    items: [
      { id: "settlement" as Tab, label: "Settlement Ledger", icon: Layers, description: "Manage active escrow settlements and fund releases" },
      { id: "disputes" as Tab, label: "Risk Resolution", icon: Gavel, description: "Admin arbitration for disputed transactions" },
    ],
  },
  {
    label: "Market",
    items: [
      { id: "market" as Tab, label: "Market Resolution", icon: Scale, description: "Resolve prediction markets past their deadline" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { id: "analytics" as Tab, label: "Business Analytics", icon: BarChart2, description: "Protocol revenue, trade volume and fee performance" },
    ],
  },
];

export default function AdminPage() {
  const { publicKey, sendTransaction } = useWallet();
  const { marketProgram, marketplaceProgram, escrowProgram, connection, provider } = useAnchorClient();
  const { triggerRefresh } = useTradeSync();
  const [tab, setTab] = useState<Tab>("init");
  const [vendorAddress, setVendorAddress] = useState("");
  const [reviewAddress, setReviewAddress] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [protocolVerified, setProtocolVerified] = useState<boolean | null>(null);

  const [requests, setRequests] = useState<{ pubkey: string, account: any }[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  // Disputes and markets state  
  const [disputes, setDisputes] = useState<{ pubkey: PublicKey; account: any }[]>([]);
  const [loadingDisputes, setLoadingDisputes] = useState(false);
  const [markets, setMarkets] = useState<any[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(false);
  const [showDemoMarkets, setShowDemoMarkets] = useState(false);

  // Trade settlement state
  const [trades, setTrades] = useState<any[]>([]);
  const [loadingTrades, setLoadingTrades] = useState(false);
  const [forceShipForm, setForceShipForm] = useState<string | null>(null);
  const [trackingInput, setTrackingInput] = useState("");
  const [txLink, setTxLink] = useState<string | null>(null);
  const isAdmin = !DEMO_ADMIN || publicKey?.toBase58() === DEMO_ADMIN;

  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch("/api/verification-requests");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests ?? []);
      }
    } finally {
      setLoadingRequests(false);
    }
  };

  // Fetch when verify tab is opened (must be in useEffect, not render body)
  useEffect(() => {
    if (tab === "verify") {
      void fetchRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Fetch trades from agent, fall back to on-chain if agent fails
  const fetchTrades = async () => {
    setLoadingTrades(true);
    try {
      const res = await fetchAgent(`${AGENT_URL}/api/trades`);
      if (res.ok) {
        const data = await res.json();
        const agentTrades = Array.isArray(data?.trades) ? data.trades : [];
        if (agentTrades.length > 0) {
          setTrades(agentTrades.map(normalizeAdminTrade).filter(Boolean));
          setLoadingTrades(false);
          return;
        }
      }
    } catch (e) {
      console.error("failed to fetch trades from agent, falling back to on-chain", e);
    }

    try {
      const accounts = await connection.getProgramAccounts(ESCROW_PROGRAM_ID);
      const rawTrades = accounts
        .map(({ pubkey, account }) => {
          try {
            const decoded = decodeRawTradeAccount(account.data as Buffer);
            return normalizeAdminTrade({ pubkey: pubkey.toBase58(), account: decoded });
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      if (rawTrades.length > 0) {
        setTrades(rawTrades);
        setLoadingTrades(false);
        return;
      }
    } catch (rawErr) {
      console.error("failed to fetch trades via raw rpc, falling back to app api", rawErr);
    }

    // Fallback 1: Try Anchor SDK
    try {
      if (!escrowProgram) {
        setTrades([]);
        setLoadingTrades(false);
        return;
      }
      const onChainTrades = (await (escrowProgram.account as any).tradeAccount.all()) as any[];
      const converted = onChainTrades.map(normalizeAdminTrade).filter(Boolean);
      setTrades(converted);
      setLoadingTrades(false);
      return;
    } catch (anchorErr: any) {
      console.warn("Anchor SDK fetch failed:", anchorErr?.message);
    }

    // Fallback 2: Use decodeUnchecked with error handling
    try {
      if (!escrowProgram || !connection) {
        setTrades([]);
        setLoadingTrades(false);
        return;
      }

      console.log("Admin: Fetching all program accounts with decodeUnchecked...");
      const programId = escrowProgram.programId;
      const accounts = await connection.getProgramAccounts(programId);

      console.log(`Admin: Found ${accounts.length} program accounts, decoding...`);

      const converted: any[] = [];
      for (const { pubkey, account } of accounts) {
        try {
          const decoded = decodeTradeAccount(escrowProgram, account.data as Buffer);

          const normalized = normalizeAdminTrade({ pubkey: pubkey.toBase58(), account: decoded });
          if (normalized) {
            converted.push(normalized);
          }
        } catch (decodeErr: any) {
          // Skip accounts that don't decode
          console.debug("Admin: Skipped non-tradeAccount:", decodeErr?.message);
          continue;
        }
      }

      console.log(`Admin: Decoded ${converted.length} trades`);
      setTrades(converted);
    } catch (e) {
      console.error("failed to fetch trades from on-chain with decodeUnchecked", e);
      setTrades([]);
    } finally {
      setLoadingTrades(false);
    }
  };

  useEffect(() => {
    if (tab === "settlement" || tab === "analytics") {
      fetchTrades();
    }
  }, [tab]);

  // Protocol verification check on mount
  useEffect(() => {
    if (!connection) return;
    const check = async () => {
      try {
        const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], MARKETPLACE_PROGRAM_ID);
        const info = await connection.getAccountInfo(configPda);
        setProtocolVerified(info !== null);
      } catch {
        setProtocolVerified(false);
      }
    };
    void check();
  }, [connection]);

  // Force Ship handler
  // HACKATHON MOCK - submit_tracking requires seller signature, so we call the agent API instead
  async function handleForceShip(trade: any) {
    if (!trackingInput) return;
    setBusy(true); setStatus(null); setTxLink(null);
    try {
      const res = await fetchAgent(`${AGENT_URL}/api/trades/${trade.trade_id}/force-ship`, {
        method: "POST",
        body: JSON.stringify({ tracking_id: trackingInput }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const json = await res.json();
      setStatus(`SUCCESS: Force shipped trade — status updated in agent DB`);
      setTxLink(null);
      setForceShipForm(null);
      fetchTrades();
    } catch (e: unknown) {
      setStatus(`ERROR: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setBusy(false); }
  }

  // Simulate Delivery handler
  async function handleSimulateDelivery(trade: any) {
    if (!publicKey) return;
    setBusy(true); setStatus(null); setTxLink(null);
    try {
      const res = await fetchAgent(`${AGENT_URL}/api/trades/${trade.tracking_id}/simulate-delivery`, {
        method: "POST",
        body: JSON.stringify({ confirmed: true }),
      });

      if (res.ok) {
        setStatus("SUCCESS: Delivery simulated in agent database.");
        fetchTrades();
        triggerRefresh();
      } else {
        throw new Error(await res.text());
      }
    } catch (e: unknown) {
      setStatus(`ERROR: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setBusy(false); }
  }

  // Release Funds handler
  async function handleReleaseFunds(trade: any) {
    if (!escrowProgram || !publicKey) return;
    setBusy(true); setStatus(null); setTxLink(null);
    try {
      const tradeIdBytes = toByteArray(trade.trade_id);
      const buyerPub = new PublicKey(trade.wallet);

      const [tradePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("trade"), buyerPub.toBuffer(), Buffer.from(tradeIdBytes)],
        ESCROW_PROGRAM_ID
      );

      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), Buffer.from(tradeIdBytes)],
        ESCROW_PROGRAM_ID
      );

      const [vaultAuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("authority")],
        ESCROW_PROGRAM_ID
      );

      // HACKATHON MOCK - use admin wallet as seller so we control the ATA
      const sellerPubkey = publicKey;
      const sellerAta = getAssociatedTokenAddressSync(USDC_MINT, sellerPubkey, false, TOKEN_PROGRAM_ID);
      const platformAta = getAssociatedTokenAddressSync(USDC_MINT, PLATFORM_TREASURY_PUBKEY, false, TOKEN_PROGRAM_ID);

      // Create any missing ATAs before calling releaseFunds — ConstraintRaw fails if ATA doesn't exist
      const missingAtaIxs: ReturnType<typeof createAssociatedTokenAccountInstruction>[] = [];
      const [sellerAtaInfo, platformAtaInfo] = await Promise.all([
        connection.getAccountInfo(sellerAta),
        connection.getAccountInfo(platformAta),
      ]);
      if (!sellerAtaInfo) {
        missingAtaIxs.push(createAssociatedTokenAccountInstruction(
          publicKey, sellerAta, sellerPubkey, USDC_MINT, TOKEN_PROGRAM_ID
        ));
      }
      if (!platformAtaInfo) {
        missingAtaIxs.push(createAssociatedTokenAccountInstruction(
          publicKey, platformAta, PLATFORM_TREASURY_PUBKEY, USDC_MINT, TOKEN_PROGRAM_ID
        ));
      }
      if (missingAtaIxs.length > 0) {
        setStatus("Creating token accounts...");
        const createAtaTx = new Transaction().add(...missingAtaIxs);
        const sig = await sendTransaction(createAtaTx, connection);
        await connection.confirmTransaction(sig, "confirmed");
      }

      const tx = await (escrowProgram.methods as any)
        .releaseFunds(tradeIdBytes)
        .accounts({
          caller: publicKey,
          tradeAccount: tradePda,
          escrowVault: vaultPda,
          vaultAuthority: vaultAuthorityPda,
          sellerTokenAccount: sellerAta,
          platformFeeAccount: platformAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      setStatus(`SUCCESS: Funds released to seller — tx: ${tx}`);
      setTxLink(`https://explorer.solana.com/tx/${tx}?cluster=devnet`);
      fetchTrades();
    } catch (e: any) {
      setStatus(`ERROR: ${e instanceof Error ? e.message : String(e)}`);
      setTxLink(null);
    } finally { setBusy(false); }
  }

  async function handleInitConfig() {
    if (!marketplaceProgram || !publicKey) return;
    setBusy(true);
    setStatus(null);
    setTxLink(null);
    try {
      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        MARKETPLACE_PROGRAM_ID,
      );
      const tx = await (marketplaceProgram.methods as any)
        .initConfig()
        .accounts({
          admin: publicKey,
          config: configPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      setStatus(`SUCCESS: MarketplaceConfig initialised — tx: ${tx}`);
    } catch (e: unknown) {
      setStatus(`ERROR: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyVendor(overrideAddress?: string) {
    const addressToVerify = overrideAddress || vendorAddress;
    if (!marketplaceProgram || !publicKey || !addressToVerify.trim()) return;
    setBusy(true);
    setStatus(null);
    setTxLink(null);
    try {
      const vendorAuth = new PublicKey(addressToVerify.trim());
      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        MARKETPLACE_PROGRAM_ID,
      );
      const [vendorProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vendor"), vendorAuth.toBuffer()],
        MARKETPLACE_PROGRAM_ID,
      );
      const tx = await (marketplaceProgram.methods as any)
        .verifyVendor()
        .accounts({
          admin: publicKey,
          config: configPda,
          vendorProfile: vendorProfilePda,
        })
        .rpc();
      setStatus(`SUCCESS: Vendor verified — tx: ${tx}`);
      if (tab === "verify") fetchRequests();
    } catch (e: unknown) {
      setStatus(`ERROR: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleCloseReview() {
    if (!marketplaceProgram || !publicKey || !reviewAddress.trim()) return;
    setBusy(true);
    setStatus(null);
    setTxLink(null);
    try {
      const reviewKey = new PublicKey(reviewAddress.trim());
      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        MARKETPLACE_PROGRAM_ID,
      );
      const tx = await (marketplaceProgram.methods as any)
        .closeReview()
        .accounts({
          admin: publicKey,
          config: configPda,
          review: reviewKey,
        })
        .rpc();
      setStatus(`SUCCESS: Review closed — tx: ${tx}`);
    } catch (e: unknown) {
      setStatus(`ERROR: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  // Helper: convert various trade_id shapes to byte array  
  const toByteArray = (v: any): number[] => {
    if (!v) return [];
    if (Array.isArray(v)) return v as number[];
    if (v instanceof Uint8Array) return Array.from(v);
    if (typeof v === 'string') {
      try { return Array.from(Buffer.from(v.replace(/^0x/, ''), 'hex')); } catch { return []; }
    }
    return [];
  };

  // Fetch disputes when disputes tab active  
  useEffect(() => {
    if (!escrowProgram || tab !== 'disputes') return;
    let cancelled = false;
    const load = async () => {
      setLoadingDisputes(true);
      try {
        const rows = (await (escrowProgram.account as any).tradeAccount.all()) as { pubkey: PublicKey; account: any }[];
        const disputed = rows.filter(r => {
          const st = r.account.status as any; return st && st.disputed !== undefined;
        });
        if (!cancelled) setDisputes(disputed as any);
      } catch (e) {
        console.warn('failed to load disputes', e);
        if (!cancelled) setDisputes([]);
      } finally { if (!cancelled) setLoadingDisputes(false); }
    };
    void load();
    const id = setInterval(() => void load(), 10_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [escrowProgram, tab]);

  // Fetch markets when market tab active  
  useEffect(() => {
    if (!marketProgram || tab !== 'market') return;
    let cancelled = false;
    const load = async () => {
      setLoadingMarkets(true);
      try {
        const rows = (await (marketProgram.account as any).marketAccount.all()) as { pubkey: PublicKey; account: any }[];
        const now = Math.floor(Date.now() / 1000);
        const toResolve = rows.filter(r => {
          const st = r.account.status as any; return st && st.open !== undefined && (Number(r.account.resolution_time) || 0) <= now;
        });
        if (!cancelled) {
          setMarkets(toResolve as any);
          setShowDemoMarkets(toResolve.length === 0);
        }
      } catch (e) {
        console.warn('failed to load markets, using fallback', e);
        if (!cancelled) {
          setMarkets([]);
          setShowDemoMarkets(true);
        }
      } finally { if (!cancelled) setLoadingMarkets(false); }
    };
    void load();
    const id = setInterval(() => void load(), 10_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [marketProgram, tab]);

  // Admin resolve helper  
  async function handleAdminResolve(trade: { pubkey: PublicKey; account: any }, winner: string) {
    if (!escrowProgram || !publicKey) return;
    setBusy(true); setStatus(null); setTxLink(null);
    try {
      const tradeIdArr = toByteArray(trade.account.trade_id);
      if (tradeIdArr.length === 0) throw new Error('invalid trade_id');
      const tradeIdBuf = Buffer.from(tradeIdArr);
      const [vaultPda] = PublicKey.findProgramAddressSync([Buffer.from('vault'), tradeIdBuf], ESCROW_PROGRAM_ID);
      const [vaultAuth] = PublicKey.findProgramAddressSync([Buffer.from('authority')], ESCROW_PROGRAM_ID);
      const winnerPub = new PublicKey(winner);
      const winnerTokenAccount = await getAssociatedTokenAddress(new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'), winnerPub, false, TOKEN_PROGRAM_ID);
      const tx = await (escrowProgram.methods as any).adminResolve(tradeIdArr, winnerPub).accounts({
        admin: publicKey,
        tradeAccount: trade.pubkey,
        escrowVault: vaultPda,
        vaultAuthority: vaultAuth,
        winnerTokenAccount: winnerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      }).rpc();
      setStatus(`Resolved - tx: ${tx}`);
      setTxLink(`https://solscan.io/tx/${tx}?cluster=devnet`);
      // refresh disputes list      
      const rows = (await (escrowProgram.account as any).tradeAccount.all()) as { pubkey: PublicKey; account: any }[];
      setDisputes(rows.filter(r => { const st = r.account.status as any; return st && st.disputed !== undefined; }));
      triggerRefresh();
    } catch (e: unknown) {
      setStatus(`ERROR: ${e instanceof Error ? e.message : String(e)}`);
      setTxLink(null);
      console.error(e);
    } finally { setBusy(false); }
  }

  // Resolve market helper  
  async function handleResolveMarket(market: any, outcome: boolean) {
    // HACKATHON MOCK - Demo market resolution
    if (!market.pubkey) {
      setBusy(true); setStatus(null); setTxLink(null);
      setTimeout(() => {
        setStatus("SUCCESS: Market resolved! In production this writes to Solana. // HACKATHON MOCK");
        setBusy(false);
      }, 1000);
      return;
    }

    if (!marketProgram || !publicKey) return;
    setBusy(true); setStatus(null); setTxLink(null);
    try {
      const tx = await (marketProgram.methods as any).resolveMarket(outcome).accounts({ creator: publicKey, marketAccount: market.pubkey }).rpc();
      setStatus(`SUCCESS: Market resolved — tx: ${tx}`);
      const rows = (await (marketProgram.account as any).marketAccount.all()) as { pubkey: PublicKey; account: any }[];
      const now = Math.floor(Date.now() / 1000);
      setMarkets(rows.filter(r => { const st = r.account.status as any; return st && st.open !== undefined && (Number(r.account.resolution_time) || 0) <= now; }));
    } catch (e: unknown) {
      setStatus(`ERROR: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setBusy(false); }
  }

  if (!publicKey) {
    return <AdminConnectPrompt />;
  }

  if (!isAdmin) {
    return (
      <main className="page-container" style={{ textAlign: "center", paddingTop: "4rem" }}>
        <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "center" }}>
          <ShieldCheck size={40} color="var(--red)" />
        </div>
        <p style={{ color: "var(--red)", marginBottom: "0.75rem" }}>Unauthorized wallet</p>
        <code style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{publicKey.toBase58()}</code>
      </main>
    );
  }

  // USDC has 6 decimals on Solana — convert atomic units to display dollars
  const USDC_DECIMALS = 1_000_000;
  const fmtUSD = (atomic: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(
      atomic / USDC_DECIMALS
    );
  const fmtUSDStat = (atomic: number) => fmtUSD(Number.isFinite(atomic) ? atomic : 0);

  // Computed treasury stats from live trade data
  const activeTVL = trades
    .filter((t: any) => t.last_known_status !== "Released")
    .reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);
  const activeShipments = trades.filter((t: any) => t.last_known_status === "InTransit").length;

  // Protocol revenue tracks earned fees from released trades plus projected fees from the active pipeline.
  const PROTOCOL_FEE_RATE = 0.02;
  const releasedTrades = trades.filter((t: any) => t.last_known_status === "Released");
  const verifiedTrades = trades.filter((t: any) => t.last_known_status === "Verified");
  const inTransitTrades = trades.filter((t: any) => t.last_known_status === "InTransit");
  const releasedVolume = releasedTrades.reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);
  const pendingSettlementVolume = verifiedTrades.reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);
  const inTransitVolume = inTransitTrades.reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);
  const earnedRevenue = releasedVolume * PROTOCOL_FEE_RATE;
  const projectedFees = (pendingSettlementVolume + inTransitVolume) * PROTOCOL_FEE_RATE;
  const pendingSettlementRevenue = pendingSettlementVolume * PROTOCOL_FEE_RATE;
  const projectedRevenueTotal = earnedRevenue + projectedFees;
  const protocolRevenueSubcopy =
    earnedRevenue > 0
      ? projectedFees > 0
        ? `${fmtUSDStat(earnedRevenue)} earned · ${fmtUSDStat(projectedFees)} projected`
        : "2% earned from released trades"
      : pendingSettlementRevenue > 0
        ? `Projected · ${fmtUSDStat(pendingSettlementRevenue)} pending settlement`
        : projectedFees > 0
          ? `Projected · ${fmtUSDStat(projectedFees)} in active pipeline`
          : "2% of released and active trade volume";

  // Resolve current sidebar item for page header
  const allNavItems = SIDEBAR_GROUPS.flatMap(g => g.items);
  const currentItem = allNavItems.find(i => i.id === tab) ?? allNavItems[0];
  const PageIcon = currentItem.icon;

  const isSuccess = (s: string) => s.startsWith("Resolved") || s.startsWith("SUCCESS");

  return (
    <>
      <style>{`
        @keyframes slideUpAdmin {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .admin-content-enter { animation: slideUpAdmin 0.22s cubic-bezier(0.4,0,0.2,1) forwards; }
        .admin-nav-btn { transition: background 0.13s ease, color 0.13s ease; }
        .admin-nav-btn:hover { background: var(--bg-hover) !important; color: var(--text-primary) !important; }
        .admin-trade-row { transition: background 0.12s ease; }
        .admin-trade-row:hover { background: var(--bg-hover) !important; }
      `}</style>

      <div style={{ display: "flex", minHeight: "calc(100vh - 64px)", background: "var(--background)" }}>

        {/* ── LEFT SIDEBAR ── */}
        <aside style={{
          width: 236,
          flexShrink: 0,
          borderRight: "1px solid var(--border)",
          background: "var(--bg-subtle)",
          display: "flex",
          flexDirection: "column",
          position: "sticky",
          top: 64,
          height: "calc(100vh - 64px)",
          overflowY: "auto",
        }}>

          {/* Sidebar brand */}
          <div style={{ padding: "1.5rem 1.25rem 0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.2rem" }}>
              <ShieldCheck size={13} color="var(--cyan)" />
              <span style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.13em", color: "var(--cyan)", textTransform: "uppercase" }}>
                Aether Admin
              </span>
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 500 }}>Protocol Command Center</div>
          </div>

          {/* Protocol status badge */}
          {protocolVerified !== null && (
            <div style={{
              margin: "0.75rem 1rem",
              padding: "0.55rem 0.75rem",
              borderRadius: "var(--radius-md)",
              background: protocolVerified ? "rgba(39,174,96,0.08)" : "rgba(243,156,18,0.08)",
              border: `1px solid ${protocolVerified ? "rgba(39,174,96,0.22)" : "rgba(243,156,18,0.22)"}`,
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
            }}>
              <ShieldCheck size={12} color={protocolVerified ? "var(--green)" : "var(--amber)"} />
              <span style={{
                fontSize: "0.66rem",
                fontWeight: 700,
                letterSpacing: "0.07em",
                color: protocolVerified ? "var(--green)" : "var(--amber)",
              }}>
                {protocolVerified ? "SYSTEM VERIFIED" : "NEEDS INIT"}
              </span>
            </div>
          )}

          {/* Nav groups */}
          <nav style={{ flex: 1, paddingBottom: "0.75rem", marginTop: "0.25rem" }}>
            {SIDEBAR_GROUPS.map(group => (
              <div key={group.label} style={{ marginBottom: "1.25rem" }}>
                <div style={{
                  padding: "0 1.25rem 0.35rem",
                  fontSize: "0.59rem",
                  fontWeight: 700,
                  letterSpacing: "0.13em",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                }}>
                  {group.label}
                </div>
                {group.items.map(item => {
                  const isActive = tab === item.id;
                  const NavIcon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="admin-nav-btn"
                      onClick={() => { setTab(item.id); setStatus(null); setTxLink(null); }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.55rem",
                        width: "100%",
                        padding: "0.52rem 1.25rem",
                        background: isActive ? "var(--cyan-dim)" : "transparent",
                        border: "none",
                        borderLeft: `2px solid ${isActive ? "var(--cyan)" : "transparent"}`,
                        color: isActive ? "var(--cyan)" : "var(--text-secondary)",
                        fontSize: "0.845rem",
                        fontWeight: isActive ? 600 : 400,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <NavIcon size={15} />
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {isActive && <ChevronRight size={11} style={{ opacity: 0.55 }} />}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Security context footer */}
          <div style={{ padding: "0.875rem 1.25rem", borderTop: "1px solid var(--border)" }}>
            <div style={{
              fontSize: "0.59rem",
              color: "var(--text-muted)",
              fontWeight: 700,
              letterSpacing: "0.11em",
              textTransform: "uppercase",
              marginBottom: "0.4rem",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
            }}>
              <KeyRound size={10} /> Security Context
            </div>
            <code style={{
              display: "block",
              fontSize: "0.68rem",
              color: "var(--cyan)",
              background: "var(--cyan-dim)",
              padding: "0.28rem 0.5rem",
              borderRadius: "var(--radius-sm)",
              wordBreak: "break-all",
              marginBottom: "0.75rem",
            }}>
              {publicKey.toBase58().slice(0, 10)}…{publicKey.toBase58().slice(-6)}
            </code>
            <WalletMultiButton />
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <div style={{ flex: 1, overflow: "auto", padding: "2rem 2.5rem", minWidth: 0 }}>

          {/* Page header */}
          <div style={{ marginBottom: "1.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
              <PageIcon size={18} color="var(--cyan)" />
              <h1 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-primary)" }}>
                {currentItem.label}
              </h1>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{currentItem.description}</p>
          </div>

          {/* Status toast */}
          {status && (
            <div style={{
              background: isSuccess(status) ? "rgba(39,174,96,0.07)" : "rgba(220,53,69,0.07)",
              border: `1px solid ${isSuccess(status) ? "rgba(39,174,96,0.2)" : "rgba(220,53,69,0.2)"}`,
              borderRadius: "var(--radius-md)",
              padding: "0.85rem 1rem",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
            }}>
              <span style={{ color: isSuccess(status) ? "var(--green)" : "var(--red)", fontSize: "0.82rem", wordBreak: "break-all" }}>
                {status}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
                {txLink && (
                  <a href={txLink} target="_blank" rel="noreferrer" style={{
                    whiteSpace: "nowrap", fontSize: "0.75rem", color: "var(--cyan)",
                    display: "inline-flex", alignItems: "center", gap: "0.35rem",
                  }}>
                    View on Solscan <ExternalLink size={12} />
                  </a>
                )}
                <button onClick={() => setStatus(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ── Animated content area ── */}
          <div key={tab} className="admin-content-enter">

            {/* PROTOCOL SETTINGS */}
            {tab === "init" && (
              <div style={{ display: "grid", gap: "1.25rem", maxWidth: 560 }}>
                {protocolVerified === true ? (
                  <div style={{
                    padding: "1.75rem 2rem",
                    borderRadius: "var(--radius-lg)",
                    background: "rgba(39,174,96,0.06)",
                    border: "1px solid rgba(39,174,96,0.2)",
                    display: "flex",
                    alignItems: "center",
                    gap: "1.25rem",
                  }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: "50%",
                      background: "rgba(39,174,96,0.12)",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <ShieldCheck size={22} color="var(--green)" />
                    </div>
                    <div>
                      <div style={{ fontSize: "0.67rem", fontWeight: 700, letterSpacing: "0.12em", color: "var(--green)", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                        SYSTEM VERIFIED
                      </div>
                      <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                        MarketplaceConfig Active
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                        Protocol is fully initialized. Config PDA detected on-chain.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="glass" style={{ padding: "1.5rem" }}>
                    <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.75rem" }}>
                      Initialise MarketplaceConfig
                    </h2>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: "1.25rem", lineHeight: 1.6 }}>
                      Must be called once after the marketplace programme is deployed. Creates the <code>config</code> PDA with your wallet as admin. Safe to call again — will fail gracefully if already initialised.
                    </p>
                    <button className="btn-primary" onClick={handleInitConfig} disabled={busy}>
                      {busy ? "Sending…" : "Init Config"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* VENDOR DESK */}
            {tab === "verify" && (
              <div style={{ display: "grid", gap: "1.5rem", maxWidth: 640 }}>
                <div className="glass" style={{ padding: "1.5rem" }}>
                  <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.75rem" }}>
                    Verify a Vendor
                  </h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: "1.25rem", lineHeight: 1.6 }}>
                    Sets <code>is_verified = true</code> on the vendor&apos;s profile PDA. Paste the vendor&apos;s wallet authority public key below.
                  </p>
                  <div style={{ marginBottom: "1.25rem" }}>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                      Vendor Authority Pubkey
                    </label>
                    <input className="form-input" type="text" placeholder="Base58 public key…" value={vendorAddress} onChange={e => setVendorAddress(e.target.value)} />
                  </div>
                  <button className="btn-primary" onClick={() => handleVerifyVendor()} disabled={busy || !vendorAddress.trim()}>
                    {busy ? "Sending…" : "Verify Vendor"}
                  </button>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>Pending Applications</h3>
                    <button onClick={fetchRequests} className="btn-ghost" style={{ padding: "0.3rem 0.7rem", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <RefreshCw size={12} /> Refresh
                    </button>
                  </div>
                  {loadingRequests ? (
                    <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: "1rem 0" }}>Loading...</div>
                  ) : requests.length === 0 ? (
                    <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: "1.75rem", textAlign: "center", border: "1px dashed var(--border)", borderRadius: "var(--radius-md)" }}>
                      No pending applications.
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: "0.6rem" }}>
                      {requests.map(req => (
                        <div key={req.pubkey} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "0.875rem 1rem",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-md)",
                          background: "var(--card)",
                        }}>
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.9rem" }}>{req.account.shop_name}</div>
                            <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                              <span className="addr">{req.account.authority}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleVerifyVendor(req.account.authority)}
                            disabled={busy}
                            style={{
                              padding: "0.4rem 0.9rem", fontSize: "0.78rem", fontWeight: 600,
                              background: "var(--cyan-dim)", color: "var(--cyan)",
                              border: "1px solid var(--cyan)", borderRadius: "var(--radius-sm)",
                              cursor: "pointer", whiteSpace: "nowrap",
                              display: "inline-flex", alignItems: "center", gap: "0.35rem",
                            }}
                          >
                            <UserCheck size={13} /> Approve
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MODERATION */}
            {tab === "review" && (
              <div className="glass" style={{ padding: "1.5rem", maxWidth: 540 }}>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.75rem" }}>
                  Close a Review Account
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: "1.25rem", lineHeight: 1.6 }}>
                  Permanently closes an abusive <code>VendorReview</code> PDA and returns rent to the admin wallet.
                </p>
                <div style={{ marginBottom: "1.25rem" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                    Review Account Pubkey
                  </label>
                  <input className="form-input" type="text" placeholder="Base58 public key…" value={reviewAddress} onChange={e => setReviewAddress(e.target.value)} />
                </div>
                <button className="btn-primary" onClick={handleCloseReview} disabled={busy || !reviewAddress.trim()}>
                  {busy ? "Sending…" : "Close Review"}
                </button>
              </div>
            )}

            {/* SETTLEMENT LEDGER */}
            {tab === "settlement" && (
              <div style={{ display: "grid", gap: "1.5rem" }}>

                {/* Treasury stats row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
                  {[
                    {
                      label: "Active TVL",
                      value: fmtUSDStat(activeTVL),
                      icon: Landmark,
                      color: "var(--cyan)",
                      glow: "rgba(34,211,238,0.18)",
                      sub: "Escrow capital live",
                    },
                    {
                      label: "Protocol Revenue",
                      value: fmtUSDStat(projectedRevenueTotal),
                      icon: TrendingUp,
                      color: "var(--green)",
                      glow: "rgba(39,174,96,0.18)",
                      sub: protocolRevenueSubcopy,
                    },
                    {
                      label: "Active Shipments",
                      value: String(activeShipments),
                      icon: Activity,
                      color: "var(--amber)",
                      glow: "rgba(243,156,18,0.18)",
                      sub: "Operational pipeline",
                    },
                  ].map(stat => {
                    const StatIcon = stat.icon;
                    return (
                      <div key={stat.label} style={{
                        position: "relative",
                        overflow: "hidden",
                        padding: "1rem 1.25rem",
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-lg)",
                        boxShadow: "0 10px 28px rgba(15,23,42,0.05)",
                      }}>
                        <div
                          aria-hidden
                          style={{
                            position: "absolute",
                            top: -30,
                            right: -18,
                            width: 96,
                            height: 96,
                            background: `radial-gradient(circle, ${stat.glow} 0%, rgba(0,0,0,0) 72%)`,
                            pointerEvents: "none",
                          }}
                        />
                        <div style={{ position: "relative", zIndex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                            <StatIcon size={13} color={stat.color} />
                            <span style={{ fontSize: "0.63rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-muted)", textTransform: "uppercase" }}>
                              {stat.label}
                            </span>
                          </div>
                          <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.45rem", fontVariantNumeric: "tabular-nums" }}>{stat.value}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <span style={{ width: 6, height: 6, borderRadius: 999, background: stat.color, flexShrink: 0 }} />
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{stat.sub}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Ledger header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Package size={18} color="var(--cyan)" /> Trade Ledger
                  </h2>
                  <button onClick={fetchTrades} className="btn-ghost" style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <RefreshCw size={13} /> Sync
                  </button>
                </div>

                {loadingTrades ? (
                  <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}>
                    Loading ledger…
                  </div>
                ) : trades.length === 0 ? (
                  <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)", border: "1px dashed var(--border)", borderRadius: "var(--radius-lg)" }}>
                    No active trades in the escrow system.
                  </div>
                ) : (
                  <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
                    {/* Table header */}
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 2fr 1fr 1.4fr 2.2fr",
                      padding: "0.6rem 1rem",
                      background: "var(--bg-subtle)",
                      borderBottom: "1px solid var(--border)",
                      gap: "0.5rem",
                    }}>
                      {["Trade Ref", "Buyer", "Amount", "Status", "Actions"].map(col => (
                        <div key={col} style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-muted)", textTransform: "uppercase" }}>
                          {col}
                        </div>
                      ))}
                    </div>

                    {/* Table rows */}
                    {trades.map((t: any) => {
                      const tradeStatus = t.last_known_status || "AwaitingShipment";
                      const STATUS_MAP: Record<string, { color: string; bg: string; border: string; label: string }> = {
                        AwaitingShipment: { color: "var(--amber)", bg: "rgba(243,156,18,0.08)", border: "rgba(243,156,18,0.25)", label: "Awaiting Ship" },
                        InTransit: { color: "var(--cyan)", bg: "var(--cyan-dim)", border: "var(--cyan)", label: "In Transit" },
                        Verified: { color: "var(--green)", bg: "rgba(39,174,96,0.08)", border: "rgba(39,174,96,0.25)", label: "Verified" },
                        Released: { color: "var(--text-muted)", bg: "var(--bg-subtle)", border: "var(--border)", label: "Released" },
                      };
                      const sc = STATUS_MAP[tradeStatus] ?? STATUS_MAP.AwaitingShipment;

                      return (
                        <div
                          key={t.id}
                          className="admin-trade-row"
                          style={{
                            display: "grid",
                            gridTemplateColumns: "2fr 2fr 1fr 1.4fr 2.2fr",
                            padding: "0.85rem 1rem",
                            borderBottom: "1px solid var(--border)",
                            borderLeft: `3px solid ${sc.color}`,
                            alignItems: "center",
                            gap: "0.5rem",
                            background: "var(--card)",
                          }}
                        >
                          <div style={{ fontFamily: "monospace", fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                            {t.trade_id.slice(0, 14)}…
                          </div>
                          <div style={{ fontSize: "0.78rem" }}>
                            <span className="addr">{t.wallet.slice(0, 8)}…{t.wallet.slice(-4)}</span>
                          </div>
                          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                            {t.amount ? fmtUSD(parseFloat(t.amount)) : "—"}
                          </div>
                          <div>
                            <span style={{
                              display: "inline-block",
                              padding: "0.22rem 0.55rem",
                              borderRadius: "var(--radius-pill)",
                              fontSize: "0.66rem",
                              fontWeight: 700,
                              letterSpacing: "0.04em",
                              background: sc.bg,
                              color: sc.color,
                              border: `1px solid ${sc.border}`,
                            }}>
                              {sc.label}
                            </span>
                          </div>
                          <div>
                            {tradeStatus === "AwaitingShipment" && (
                              forceShipForm === t.trade_id ? (
                                <div>
                                  <input
                                    className="form-input"
                                    style={{ marginBottom: "0.35rem", fontSize: "0.76rem", padding: "0.32rem 0.55rem" }}
                                    value={trackingInput}
                                    onChange={e => setTrackingInput(e.target.value)}
                                    placeholder="Tracking ID…"
                                  />
                                  <div style={{ display: "flex", gap: "0.35rem" }}>
                                    <button
                                      style={{ flex: 1, padding: "0.32rem 0.5rem", fontSize: "0.72rem", fontWeight: 700, background: "var(--foreground)", color: "var(--background)", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer" }}
                                      onClick={() => handleForceShip(t)} disabled={busy}
                                    >
                                      Confirm
                                    </button>
                                    <button className="btn-ghost" style={{ padding: "0.32rem 0.5rem", fontSize: "0.72rem" }} onClick={() => setForceShipForm(null)}>
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  style={{
                                    display: "inline-flex", alignItems: "center", gap: "0.35rem",
                                    padding: "0.36rem 0.8rem", fontSize: "0.74rem", fontWeight: 600,
                                    background: "rgba(243,156,18,0.1)", color: "var(--amber)",
                                    border: "1px solid rgba(243,156,18,0.3)", borderRadius: "var(--radius-sm)", cursor: "pointer",
                                  }}
                                  onClick={() => { setForceShipForm(t.trade_id); setTrackingInput("DHL-DEMO-" + Date.now().toString().slice(-6)); }}
                                >
                                  <Truck size={13} /> Force Ship
                                </button>
                              )
                            )}
                            {tradeStatus === "InTransit" && (
                              <button
                                style={{
                                  display: "inline-flex", alignItems: "center", gap: "0.35rem",
                                  padding: "0.36rem 0.8rem", fontSize: "0.74rem", fontWeight: 600,
                                  background: "var(--cyan-dim)", color: "var(--cyan)",
                                  border: "1px solid var(--cyan)", borderRadius: "var(--radius-sm)", cursor: "pointer",
                                }}
                                onClick={() => handleSimulateDelivery(t)} disabled={busy}
                              >
                                <CheckCircle size={13} /> Sim. Delivery
                              </button>
                            )}
                            {tradeStatus === "Verified" && (
                              <button
                                style={{
                                  display: "inline-flex", alignItems: "center", gap: "0.35rem",
                                  padding: "0.36rem 0.8rem", fontSize: "0.74rem", fontWeight: 600,
                                  background: "rgba(39,174,96,0.1)", color: "var(--green)",
                                  border: "1px solid rgba(39,174,96,0.3)", borderRadius: "var(--radius-sm)", cursor: "pointer",
                                }}
                                onClick={() => handleReleaseFunds(t)} disabled={busy}
                              >
                                <WalletIcon size={13} /> Release Funds
                              </button>
                            )}
                            {tradeStatus === "Released" && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.74rem", color: "var(--text-muted)" }}>
                                <CheckCircle size={13} /> Complete
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* RISK RESOLUTION */}
            {tab === "disputes" && (
              <div style={{ display: "grid", gap: "1rem", maxWidth: 700 }}>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                  Trades in disputed state requiring admin arbitration.
                </p>
                {loadingDisputes ? (
                  <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>Loading disputes…</div>
                ) : disputes.length === 0 ? (
                  <div style={{ padding: "2.5rem", textAlign: "center", border: "1px dashed var(--border)", borderRadius: "var(--radius-lg)", color: "var(--text-muted)" }}>
                    <AlertTriangle size={28} style={{ marginBottom: "0.75rem", opacity: 0.4, display: "block", margin: "0 auto 0.75rem" }} />
                    No active disputes
                  </div>
                ) : (
                  disputes.map(d => (
                    <div key={d.pubkey.toBase58()} style={{
                      padding: "1.25rem",
                      border: "1px solid rgba(220,53,69,0.2)",
                      borderLeft: "3px solid var(--red)",
                      borderRadius: "var(--radius-lg)",
                      background: "rgba(220,53,69,0.03)",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.45rem" }}>
                            TXN: {Buffer.from(toByteArray(d.account.trade_id || [])).toString("hex").slice(0, 24)}…
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                            Buyer: <span className="addr">{(d.account.buyer as PublicKey)?.toBase58?.() ?? String(d.account.buyer)}</span>
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                            Seller: <span className="addr">{(d.account.seller as PublicKey)?.toBase58?.() ?? String(d.account.seller)}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                          <button
                            style={{ padding: "0.42rem 0.9rem", fontSize: "0.78rem", fontWeight: 600, background: "rgba(39,174,96,0.1)", color: "var(--green)", border: "1px solid rgba(39,174,96,0.3)", borderRadius: "var(--radius-sm)", cursor: "pointer" }}
                            disabled={busy} onClick={() => void handleAdminResolve(d, String(d.account.buyer))}
                          >
                            Settle → Buyer
                          </button>
                          <button
                            style={{ padding: "0.42rem 0.9rem", fontSize: "0.78rem", fontWeight: 600, background: "var(--cyan-dim)", color: "var(--cyan)", border: "1px solid var(--cyan)", borderRadius: "var(--radius-sm)", cursor: "pointer" }}
                            disabled={busy} onClick={() => void handleAdminResolve(d, String(d.account.seller))}
                          >
                            Settle → Seller
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* BUSINESS ANALYTICS */}
            {tab === "analytics" && (() => {
              const totalVolume = trades.reduce((s: number, t: any) => s + (parseFloat(t.amount) || 0), 0);
              const byStatus: Record<string, number> = {};
              trades.forEach((t: any) => {
                const s = t.last_known_status || "AwaitingShipment";
                byStatus[s] = (byStatus[s] || 0) + 1;
              });
              const STATUS_COLORS: Record<string, string> = {
                AwaitingShipment: "var(--amber)",
                InTransit: "var(--cyan)",
                Verified: "var(--green)",
                Released: "var(--text-muted)",
              };

              return (
                <div style={{ display: "grid", gap: "1.5rem" }}>

                  {/* KPI row */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
                    {[
                      {
                        label: "Total Volume",
                        value: fmtUSDStat(totalVolume),
                        icon: DollarSign,
                        color: "var(--cyan)",
                        glow: "rgba(34,211,238,0.18)",
                        sub: `${trades.length} trade${trades.length !== 1 ? "s" : ""}`,
                      },
                      {
                        label: "Released Volume",
                        value: fmtUSDStat(releasedVolume),
                        icon: ArrowUpRight,
                        color: "var(--green)",
                        glow: "rgba(39,174,96,0.18)",
                        sub: pendingSettlementVolume > 0
                          ? `${releasedTrades.length} settled · ${fmtUSDStat(pendingSettlementVolume)} pending settlement`
                          : `${releasedTrades.length} settled`,
                      },
                      {
                        label: "Protocol Revenue",
                        value: fmtUSDStat(projectedRevenueTotal),
                        icon: TrendingUp,
                        color: "var(--violet, #7c3aed)",
                        glow: "rgba(124,58,237,0.16)",
                        sub: protocolRevenueSubcopy,
                      },
                      {
                        label: "Fee Rate",
                        value: "2.00%",
                        icon: Percent,
                        color: "var(--amber)",
                        glow: "rgba(243,156,18,0.18)",
                        sub: "Fixed protocol fee",
                      },
                    ].map(stat => {
                      const KpiIcon = stat.icon;
                      return (
                        <div key={stat.label} style={{
                          position: "relative",
                          overflow: "hidden",
                          padding: "1.1rem 1.25rem",
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-lg)",
                          borderTop: `3px solid ${stat.color}`,
                          boxShadow: "0 12px 32px rgba(15,23,42,0.06)",
                        }}>
                          <div
                            aria-hidden
                            style={{
                              position: "absolute",
                              top: -32,
                              right: -16,
                              width: 100,
                              height: 100,
                              background: `radial-gradient(circle, ${stat.glow} 0%, rgba(0,0,0,0) 72%)`,
                              pointerEvents: "none",
                            }}
                          />
                          <div style={{ position: "relative", zIndex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.55rem" }}>
                              <KpiIcon size={13} color={stat.color} />
                              <span style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-muted)", textTransform: "uppercase" }}>{stat.label}</span>
                            </div>
                            <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.35rem", fontVariantNumeric: "tabular-nums" }}>{stat.value}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <span style={{ width: 6, height: 6, borderRadius: 999, background: stat.color, flexShrink: 0 }} />
                              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{stat.sub}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Revenue breakdown */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>

                    {/* Fee accumulation */}
                    <div style={{ padding: "1.25rem", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                        <DollarSign size={15} color="var(--cyan)" />
                        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)" }}>Revenue Breakdown</span>
                      </div>
                      <div style={{ display: "grid", gap: "0.65rem" }}>
                        {[
                          { label: "Gross Released Volume", value: releasedVolume, color: "var(--green)" },
                          { label: "Pending Settlement Volume", value: pendingSettlementVolume, color: "var(--amber)" },
                          { label: "Earned Revenue (2%)", value: earnedRevenue, color: "var(--cyan)" },
                          { label: "Projected Revenue (2%)", value: projectedFees, color: "var(--violet, #7c3aed)" },
                          { label: "Seller Net Proceeds (98%)", value: releasedVolume - earnedRevenue, color: "var(--text-secondary)" },
                        ].map(row => (
                          <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.55rem 0.75rem", background: "var(--bg-subtle)", borderRadius: "var(--radius-sm)" }}>
                            <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>{row.label}</span>
                            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: row.color, fontVariantNumeric: "tabular-nums" }}>{fmtUSDStat(row.value)}</span>
                          </div>
                        ))}
                        <div style={{ height: "1px", background: "var(--border)", margin: "0.15rem 0" }} />
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.45rem 0.75rem" }}>
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.07em", color: "var(--text-muted)", textTransform: "uppercase" }}>Active Escrow (TVL)</span>
                          <span style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--cyan)", fontVariantNumeric: "tabular-nums" }}>{fmtUSDStat(activeTVL)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Trade status breakdown */}
                    <div style={{ padding: "1.25rem", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                        <BarChart2 size={15} color="var(--cyan)" />
                        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)" }}>Trade Pipeline</span>
                      </div>
                      {trades.length === 0 ? (
                        <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem" }}>No trade data — sync from Settlement Ledger</div>
                      ) : (
                        <div style={{ display: "grid", gap: "0.55rem" }}>
                          {Object.entries(byStatus).map(([status, count]) => {
                            const pct = Math.round((count / trades.length) * 100);
                            const clr = STATUS_COLORS[status] ?? "var(--text-muted)";
                            return (
                              <div key={status}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{status}</span>
                                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: clr }}>{count} ({pct}%)</span>
                                </div>
                                <div style={{ height: 6, background: "var(--bg-subtle)", borderRadius: 99, overflow: "hidden" }}>
                                  <div style={{ height: "100%", width: `${pct}%`, background: clr, borderRadius: 99, transition: "width 0.4s ease" }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Per-trade fee ledger */}
                  {releasedTrades.length > 0 && (
                    <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
                      <div style={{ padding: "0.75rem 1rem", background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)" }}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-muted)", textTransform: "uppercase" }}>
                          Fee Collection Ledger — Settled Trades
                        </span>
                      </div>
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "2fr 2fr 1.2fr 1.2fr 1.2fr",
                        padding: "0.5rem 1rem",
                        background: "var(--bg-subtle)",
                        borderBottom: "1px solid var(--border)",
                        gap: "0.5rem",
                      }}>
                        {["Trade Ref", "Buyer", "Gross Amount", "Protocol Fee (2%)", "Seller Net"].map(col => (
                          <div key={col} style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-muted)", textTransform: "uppercase" }}>{col}</div>
                        ))}
                      </div>
                      {releasedTrades.map((t: any) => {
                        const gross = parseFloat(t.amount) || 0;
                        const fee = gross * PROTOCOL_FEE_RATE;
                        const net = gross - fee;
                        return (
                          <div key={t.id} className="admin-trade-row" style={{
                            display: "grid",
                            gridTemplateColumns: "2fr 2fr 1.2fr 1.2fr 1.2fr",
                            padding: "0.75rem 1rem",
                            borderBottom: "1px solid var(--border)",
                            borderLeft: "3px solid var(--text-muted)",
                            alignItems: "center",
                            gap: "0.5rem",
                            background: "var(--card)",
                          }}>
                            <div style={{ fontFamily: "monospace", fontSize: "0.7rem", color: "var(--text-secondary)" }}>{t.trade_id.slice(0, 14)}…</div>
                            <div><span className="addr">{t.wallet.slice(0, 8)}…{t.wallet.slice(-4)}</span></div>
                            <div style={{ fontSize: "0.8rem", fontWeight: 700 }}>{fmtUSD(gross)}</div>
                            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--cyan)" }}>{fmtUSD(fee)}</div>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{fmtUSD(net)}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              );
            })()}

            {/* MARKET RESOLUTION */}
            {tab === "market" && (
              <div style={{ display: "grid", gap: "1rem", maxWidth: 700 }}>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                  Open prediction markets past their resolution time.
                </p>
                {loadingMarkets ? (
                  <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>Loading markets…</div>
                ) : (markets.length === 0 && !showDemoMarkets) ? (
                  <div style={{ padding: "2.5rem", textAlign: "center", border: "1px dashed var(--border)", borderRadius: "var(--radius-lg)", color: "var(--text-muted)" }}>
                    <Scale size={28} style={{ marginBottom: "0.75rem", opacity: 0.4, display: "block", margin: "0 auto 0.75rem" }} />
                    No markets pending resolution
                  </div>
                ) : (
                  <>
                    {markets.map(m => (
                      <div key={m.pubkey.toBase58()} style={{
                        padding: "1.25rem", border: "1px solid var(--border)",
                        borderRadius: "var(--radius-lg)", background: "var(--card)",
                        display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem",
                      }}>
                        <div>
                          <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.9rem" }}>
                            {String(m.account.question ?? m.pubkey.toBase58())}
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                            Resolves: {new Date(Number(m.account.resolution_time) * 1000).toLocaleString()}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                          <button className="btn-ghost" style={{ fontSize: "0.8rem" }} disabled={busy} onClick={() => void handleResolveMarket(m, true)}>YES</button>
                          <button className="btn-primary" style={{ fontSize: "0.8rem" }} disabled={busy} onClick={() => void handleResolveMarket(m, false)}>NO</button>
                        </div>
                      </div>
                    ))}

                    {showDemoMarkets && [{
                      id: "demo-market-001",
                      pubkey: null,
                      account: {
                        question: "Shipment 64NXXi...NR4YNJ — Customs Delay Risk",
                        total_yes: new BN(1200),
                        total_no: new BN(800),
                        resolution_time: new BN(Math.floor(Date.now() / 1000) - 3600),
                      },
                    }].map(m => (
                      <div key={m.id} style={{ padding: "1.5rem", border: "1px solid var(--cyan-dim)", borderRadius: "var(--radius-lg)", background: "var(--card)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                          <div>
                            <div style={{ fontSize: "0.63rem", color: "var(--cyan)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                              DEMO MARKET
                            </div>
                            <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.95rem" }}>{m.account.question}</div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Total Pool</div>
                            <div style={{ fontWeight: 800, color: "var(--text-primary)", fontSize: "1.05rem" }}>$2,000 USDC</div>
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
                          <div style={{ padding: "0.75rem", background: "rgba(39,174,96,0.06)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(39,174,96,0.12)" }}>
                            <div style={{ fontSize: "0.66rem", color: "var(--green)", fontWeight: 700, letterSpacing: "0.08em" }}>YES POOL</div>
                            <div style={{ fontSize: "1.05rem", fontWeight: 800 }}>$1,200</div>
                          </div>
                          <div style={{ padding: "0.75rem", background: "rgba(220,53,69,0.05)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(220,53,69,0.12)" }}>
                            <div style={{ fontSize: "0.66rem", color: "var(--red)", fontWeight: 700, letterSpacing: "0.08em" }}>NO POOL</div>
                            <div style={{ fontSize: "1.05rem", fontWeight: 800 }}>$800</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "0.75rem" }}>
                          <button
                            style={{ flex: 1, padding: "0.6rem", fontSize: "0.82rem", fontWeight: 700, background: "rgba(39,174,96,0.1)", color: "var(--green)", border: "1px solid rgba(39,174,96,0.3)", borderRadius: "var(--radius-sm)", cursor: "pointer" }}
                            onClick={() => handleResolveMarket(m, true)} disabled={busy}
                          >
                            Resolve YES
                          </button>
                          <button
                            style={{ flex: 1, padding: "0.6rem", fontSize: "0.82rem", fontWeight: 700, background: "rgba(220,53,69,0.06)", color: "var(--red)", border: "1px solid rgba(220,53,69,0.22)", borderRadius: "var(--radius-sm)", cursor: "pointer" }}
                            onClick={() => handleResolveMarket(m, false)} disabled={busy}
                          >
                            Resolve NO
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

          </div>{/* /admin-content-enter */}
        </div>{/* /main content */}
      </div>{/* /layout */}
    </>
  );
}

