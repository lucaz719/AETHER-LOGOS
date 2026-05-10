"use client";

import { BorshAccountsCoder } from "@coral-xyz/anchor";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { BN } from "bn.js";
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { useTradeSync } from "@/context/TradeContext";
import { useAnchorClient } from "@/hooks/useAnchorClient";
import { MARKET_PROGRAM_ID, ESCROW_PROGRAM_ID, MARKETPLACE_PROGRAM_ID, USDC_MINT, PLATFORM_TREASURY_PUBKEY, TOKEN_PROGRAM_ID } from "@/lib/anchor";
import tradeEscrowIdl from "@/lib/idl/trade_escrow.json";
import { KeyRound, ShieldCheck, Scale, Wallet as WalletIcon, Gavel, Package, Truck, CheckCircle, ExternalLink, RefreshCw } from "lucide-react";
import { fetchAgent } from "@/lib/agentApi";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

type Tab = "init" | "verify" | "review" | "disputes" | "market" | "settlement";
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

export default function AdminPage() {
  const { publicKey, sendTransaction } = useWallet();
  const { marketProgram, marketplaceProgram, escrowProgram, connection, provider } = useAnchorClient();
  const { triggerRefresh } = useTradeSync();
  const [tab, setTab] = useState<Tab>("init");
  const [vendorAddress, setVendorAddress] = useState("");
  const [reviewAddress, setReviewAddress] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  
  const [requests, setRequests] = useState<{pubkey: string, account: any}[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  // Disputes and markets state  
  const [disputes, setDisputes] = useState<{pubkey: PublicKey; account: any}[]>([]);  
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

  // Fetch when verify tab is opened
  if (tab === "verify" && requests.length === 0 && !loadingRequests) {
    void fetchRequests();
  }

  // Fetch trades from agent, fall back to on-chain if agent fails
  const fetchTrades = async () => {
    setLoadingTrades(true);
    try {
      const res = await fetchAgent("http://localhost:8080/api/trades");
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
    if (tab === "settlement") {
      fetchTrades();
    }
  }, [tab]);

  // Force Ship handler
  // HACKATHON MOCK - submit_tracking requires seller signature, so we call the agent API instead
  async function handleForceShip(trade: any) {
    if (!trackingInput) return;
    setBusy(true); setStatus(null); setTxLink(null);
    try {
      const res = await fetchAgent(`${process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8080"}/api/trades/${trade.trade_id}/force-ship`, {
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
      const res = await fetchAgent(`http://localhost:8080/api/trades/${trade.tracking_id}/simulate-delivery`, {
        method: "POST",
        body: JSON.stringify({ confirmed: true }),
      });
      
      if (res.ok) {
        setStatus("SUCCESS: Delivery simulated in agent database.");
        fetchTrades();
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
        <p style={{ color: "var(--red)", marginBottom: "0.75rem" }}>
          Unauthorized wallet
        </p>
        <code style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
          {publicKey.toBase58()}
        </code>
      </main>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "init", label: "Init Config" },
    { id: "verify", label: "Verify Vendor" },
    { id: "review", label: "Close Review" },
    { id: "disputes", label: "Disputes" },
    { id: "market", label: "Market Resolution" },
    { id: "settlement", label: "Trade Settlement" },
  ];

  return (
    <main className="page-container" style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.4rem" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
          <ShieldCheck size={22} />
          Admin Panel
        </span>
      </h1>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: "2rem" }}>
        Connected as <code style={{ color: "var(--cyan)", fontSize: "0.82rem" }}>{publicKey.toBase58().slice(0, 12)}…</code> — ensure this matches the admin pubkey in MarketplaceConfig.
      </p>

      {/* Tab bar */}
      <div style={{ 
        display: "flex", 
        gap: "0.5rem", 
        marginBottom: "2rem", 
        borderBottom: "1px solid var(--border)", 
        paddingBottom: "1rem",
        overflowX: "auto",
        flexWrap: "nowrap",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none"
      }} className="no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setTab(t.id); setStatus(null); setTxLink(null); }}
            style={{
              padding: "0.45rem 1rem",
              borderRadius: "var(--radius-pill)",
              border: `1px solid ${tab === t.id ? "var(--cyan)" : "var(--border)"}`,
              background: tab === t.id ? "var(--cyan-dim)" : "transparent",
              color: tab === t.id ? "var(--cyan)" : "var(--text-secondary)",
              fontWeight: tab === t.id ? 700 : 400,
              fontSize: "0.85rem",
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Status */}
      {status && (
        <div
          style={{
            background: status.startsWith("Resolved") || status.startsWith("SUCCESS")
              ? "rgba(52,211,153,0.08)"
              : "rgba(244,63,94,0.08)",
            border: `1px solid ${
              status.startsWith("Resolved") || status.startsWith("SUCCESS")
                ? "rgba(52,211,153,0.25)"
                : "rgba(244,63,94,0.2)"
            }`,
            borderRadius: "var(--radius-md)",
            padding: "0.85rem 1rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <span
            style={{
              color: status.startsWith("Resolved") || status.startsWith("SUCCESS")
                ? "var(--green)"
                : "var(--red)",
              fontSize: "0.82rem",
              wordBreak: "break-all",
            }}
          >
            {status}
          </span>

          {txLink && (
            <a
              href={txLink}
              target="_blank"
              rel="noreferrer"
              style={{
                whiteSpace: "nowrap",
                fontSize: "0.75rem",
                color: "var(--cyan)",
                textDecoration: "underline",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              View on Solscan
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      )}

      {/* Tab content wrappers for safety */}
      <div className="admin-tab-content">
        {tab === "init" && (
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

        {tab === "verify" && (
          <div className="glass" style={{ padding: "1.5rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.75rem" }}>
              Verify a Vendor
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: "1.25rem", lineHeight: 1.6 }}>
              Sets <code>is_verified = true</code> on the vendor&apos;s profile PDA. Paste the vendor&apos;s wallet authority public key below.
            </p>
            <div className="form-group" style={{ marginBottom: "1.25rem" }}>
              <label className="form-label">Vendor Authority Pubkey</label>
              <input
                className="form-input"
                type="text"
                placeholder="Base58 public key…"
                value={vendorAddress}
                onChange={(e) => setVendorAddress(e.target.value)}
              />
            </div>
            <button className="btn-primary" onClick={() => handleVerifyVendor()} disabled={busy || !vendorAddress.trim()}>
              {busy ? "Sending…" : "Verify Vendor"}
            </button>
            
            <hr style={{ margin: "2rem 0", borderColor: "var(--border)", opacity: 0.5 }} />
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>Pending Requests</h3>
              <button onClick={fetchRequests} className="btn-ghost" style={{ padding: "0.2rem 0.6rem", fontSize: "0.8rem" }}>Refresh</button>
            </div>
            
            {loadingRequests ? (
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading...</div>
            ) : requests.length === 0 ? (
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No pending requests found.</div>
            ) : (
              <div style={{ display: "grid", gap: "0.75rem" }}>
                {requests.map(req => (
                  <div key={req.pubkey} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--bg-surface)" }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{req.account.shop_name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        Authority: <span className="addr">{req.account.authority}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleVerifyVendor(req.account.authority)} 
                      disabled={busy}
                      className="btn-secondary"
                      style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
                    >
                      Verify
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "review" && (
          <div className="glass" style={{ padding: "1.5rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.75rem" }}>
              Close (Delete) a Review
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: "1.25rem", lineHeight: 1.6 }}>
              Permanently closes an abusive <code>VendorReview</code> PDA and returns rent to the admin wallet. Paste the review account public key below.
            </p>          
            <div className="form-group" style={{ marginBottom: "1.25rem" }}>            
              <label className="form-label">Review Account Pubkey</label>            
              <input className="form-input" type="text" placeholder="Base58 public key…" value={reviewAddress} onChange={(e) => setReviewAddress(e.target.value)} />          
            </div>          
            <button className="btn-primary" onClick={handleCloseReview} disabled={busy || !reviewAddress.trim()}>{busy ? "Sending…" : "Close Review"}</button>        
          </div>      
        )}      

        {tab === "disputes" && (        
          <div className="glass" style={{ padding: "1.5rem" }}>          
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.75rem" }}><Gavel size={18} /> Disputed Trades</h2>          
            <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: "1rem" }}>List of trades currently in Disputed state. Admin may resolve in favor of buyer or seller.</p>          
            {loadingDisputes ? (            
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading...</div>          
            ) : disputes.length === 0 ? (            
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No disputes found.</div>          
            ) : (            
              <div style={{ display: 'grid', gap: '0.75rem' }}>{disputes.map(d => (              
                <div key={d.pubkey.toBase58()} style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>                
                  <div>                  
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{Buffer.from(toByteArray(d.account.trade_id || [])).toString('hex')}</div>                  
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Buyer: <span className="addr">{(d.account.buyer as PublicKey)?.toBase58?.() ?? String(d.account.buyer)}</span> • Seller: <span className="addr">{(d.account.seller as PublicKey)?.toBase58?.() ?? String(d.account.seller)}</span></div>                
                  </div>                
                  <div style={{ display: 'flex', gap: '0.5rem' }}>                  
                    <button className="btn-ghost" disabled={busy} onClick={() => void handleAdminResolve(d, String(d.account.buyer))}>Settle for Buyer</button>                  
                    <button className="btn-primary" disabled={busy} onClick={() => void handleAdminResolve(d, String(d.account.seller))}>Settle for Seller</button>                
                  </div>              
                </div>            
              ))}</div>          
            )}        
          </div>      
        )}      

        {tab === "market" && (        
          <div className="glass" style={{ padding: "1.5rem" }}>          
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.75rem" }}><Scale size={18} /> Market Resolution</h2>          
            <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: "1rem" }}>Open markets past their resolution time are shown here. The creator may resolve; admin may call resolve if needed.</p>          
            {loadingMarkets ? (            
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading...</div>          
            ) : (markets.length === 0 && !showDemoMarkets) ? (            
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No markets to resolve.</div>          
            ) : (            
              <div style={{ display: 'grid', gap: '1rem' }}>
                {markets.map(m => (              
                  <div key={m.pubkey.toBase58()} style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>                
                    <div>                  
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{String(m.account.question ?? m.pubkey.toBase58())}</div>                  
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Resolves at: {new Date(Number(m.account.resolution_time) * 1000).toLocaleString()}</div>                
                    </div>                
                    <div style={{ display: 'flex', gap: '0.5rem' }}>                  
                      <button className="btn-ghost" disabled={busy} onClick={() => void handleResolveMarket(m, true)}>Outcome: YES</button>                  
                      <button className="btn-primary" disabled={busy} onClick={() => void handleResolveMarket(m, false)}>Outcome: NO</button>                
                    </div>              
                  </div>            
                ))}
                
                {showDemoMarkets && [
                  {
                    id: "demo-market-001",
                    pubkey: null, // HACKATHON MOCK
                    account: {
                      question: "Shipment 64NXXi...NR4YNJ — Customs Delay Risk",
                      total_yes: new BN(1200),
                      total_no: new BN(800),
                      resolution_time: new BN(Math.floor(Date.now() / 1000) - 3600)
                    }
                  }
                ].map(m => (
                  <div key={m.id} style={{ padding: '1.25rem', border: '1px solid var(--cyan-dim)', background: 'rgba(6, 182, 212, 0.03)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--cyan)', fontWeight: 700, marginBottom: '0.25rem' }}>DEMO MARKET // HACKATHON MOCK</div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>{m.account.question}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Pool</div>
                        <div style={{ fontWeight: 900, color: 'var(--text-primary)' }}>$2,000 USDC</div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                      <div style={{ padding: '0.75rem', background: 'rgba(34, 197, 94, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(34, 197, 94, 0.1)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--green)', fontWeight: 600 }}>YES POOL</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>$1,200</div>
                      </div>
                      <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--red)', fontWeight: 600 }}>NO POOL</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>$800</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button className="btn-primary" style={{ flex: 1, background: 'var(--green)', borderColor: 'var(--green)' }} onClick={() => handleResolveMarket(m, true)} disabled={busy}>
                        Resolve YES ✓
                      </button>
                      <button className="btn-primary" style={{ flex: 1, background: 'var(--red)', borderColor: 'var(--red)' }} onClick={() => handleResolveMarket(m, false)} disabled={busy}>
                        Resolve NO ✗
                      </button>
                    </div>
                  </div>
                ))}
              </div>          
            )}        
          </div>      
        )}

        {tab === "settlement" && (
          <div style={{ display: "grid", gap: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Package size={20} /> Active Trades
              </h2>
              <button onClick={fetchTrades} className="btn-ghost" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}>
                <RefreshCw size={14} style={{ marginRight: "0.4rem" }} /> Refresh
              </button>
            </div>

            {loadingTrades ? (
              <div className="glass" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>Loading trades...</div>
            ) : trades.length === 0 ? (
              <div className="glass" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                No active trades. <br/> Go place a trade on the marketplace to see it here.
              </div>
            ) : (
              trades.map((t) => {
                const status = t.last_known_status || "AwaitingShipment";
                return (
                  <div key={t.id} className="glass" style={{ padding: "1.5rem", borderLeft: status === "Verified" ? "4px solid var(--green)" : status === "InTransit" ? "4px solid var(--cyan)" : "4px solid var(--amber)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem", fontFamily: "monospace" }}>
                          REF: {t.trade_id.slice(0, 16)}...
                        </div>
                        <div style={{ fontSize: "0.88rem", color: "var(--text-primary)", fontWeight: 700 }}>
                          Buyer: <span className="addr">{t.wallet.slice(0, 8)}...{t.wallet.slice(-4)}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--green)" }}>
                          USDC Locked
                        </div>
                        <span className={`badge-pill ${status === "Verified" ? "badge-success" : status === "InTransit" ? "badge-info" : "badge-warning"}`} style={{ marginTop: "0.4rem" }}>
                          {status === "AwaitingShipment" ? "Awaiting Shipment" : status}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
                      {status === "AwaitingShipment" && (
                        <div style={{ width: "100%" }}>
                          {forceShipForm === t.trade_id ? (
                            <div className="glass" style={{ padding: "1rem", marginTop: "0.5rem", background: "rgba(255,255,255,0.02)" }}>
                              <label className="form-label">Demo Tracking ID</label>
                              <input 
                                className="form-input" 
                                value={trackingInput} 
                                onChange={(e) => setTrackingInput(e.target.value)} 
                                style={{ marginBottom: "0.75rem" }}
                              />
                              <div style={{ display: "flex", gap: "0.5rem" }}>
                                <button className="btn-primary" onClick={() => handleForceShip(t)} disabled={busy}>Confirm Force Ship</button>
                                <button className="btn-ghost" onClick={() => setForceShipForm(null)}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <button className="btn-secondary" style={{ width: "100%" }} onClick={() => {
                              setForceShipForm(t.trade_id);
                              setTrackingInput("DHL-DEMO-" + Date.now().toString().slice(-6));
                            }}>
                              <Truck size={16} style={{ marginRight: "0.5rem" }} /> Force Ship
                            </button>
                          )}
                        </div>
                      )}

                      {status === "InTransit" && (
                        <button className="btn-primary" style={{ width: "100%" }} onClick={() => handleSimulateDelivery(t)} disabled={busy}>
                          <CheckCircle size={16} style={{ marginRight: "0.5rem" }} /> Simulate Delivery
                        </button>
                      )}

                      {status === "Verified" && (
                        <button className="btn-primary" style={{ width: "100%", background: "var(--green)", border: "none" }} onClick={() => handleReleaseFunds(t)} disabled={busy}>
                          <WalletIcon size={16} style={{ marginRight: "0.5rem" }} /> Release Funds
                        </button>
                      )}

                      {status === "Released" && (
                        <div style={{ width: "100%", textAlign: "center", color: "var(--green)", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                          <CheckCircle size={20} /> Complete
                        </div>
                      )}
                    </div>
                    
                    {status === "Released" && (
                      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.75rem", textAlign: "center" }}>
                        ✓ Funds released to seller
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </main>
  );
}
