"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { BN } from "bn.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { useAnchorClient } from "@/hooks/useAnchorClient";
import { MARKET_PROGRAM_ID, ESCROW_PROGRAM_ID } from "@/lib/anchor";
import { KeyRound, ShieldCheck, Scale, Wallet as WalletIcon, Gavel } from "lucide-react";

type Tab = "init" | "verify" | "review" | "disputes" | "market";

export default function AdminPage() {
  const { publicKey } = useWallet();
  const { marketProgram, escrowProgram, connection, provider } = useAnchorClient();
  const [tab, setTab] = useState<Tab>("init");
  const [vendorAddress, setVendorAddress] = useState("");
  const [reviewAddress, setReviewAddress] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  
  const [requests, setRequests] = useState<{pubkey: string, account: any}[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  // Disputes and markets state  const [disputes, setDisputes] = useState<{pubkey: PublicKey, account: any}[]>([]);  const [loadingDisputes, setLoadingDisputes] = useState(false);  const [markets, setMarkets] = useState<{pubkey: PublicKey, account: any}[]>([]);  const [loadingMarkets, setLoadingMarkets] = useState(false);

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

  async function handleInitConfig() {
    if (!marketProgram || !publicKey) return;
    setBusy(true);
    setStatus(null);
    try {
      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        MARKET_PROGRAM_ID,
      );
      const tx = await (marketProgram.methods as any)
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
    if (!marketProgram || !publicKey || !addressToVerify.trim()) return;
    setBusy(true);
    setStatus(null);
    try {
      const vendorAuth = new PublicKey(addressToVerify.trim());
      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        MARKET_PROGRAM_ID,
      );
      const [vendorProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vendor"), vendorAuth.toBuffer()],
        MARKET_PROGRAM_ID,
      );
      const tx = await (marketProgram.methods as any)
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
    if (!marketProgram || !publicKey || !reviewAddress.trim()) return;
    setBusy(true);
    setStatus(null);
    try {
      const reviewKey = new PublicKey(reviewAddress.trim());
      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        MARKET_PROGRAM_ID,
      );
      const tx = await (marketProgram.methods as any)
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

  // Helper: convert various trade_id shapes to byte array  const toByteArray = (v: any): number[] => {    if (!v) return [];    if (Array.isArray(v)) return v as number[];    if (v instanceof Uint8Array) return Array.from(v);    if (typeof v === 'string') {      try { return Array.from(Buffer.from(v.replace(/^0x/, ''), 'hex')); } catch { return []; }    }    return [];  };  // Fetch disputes when disputes tab active  useEffect(() => {    if (!escrowProgram || tab !== 'disputes') return;    let cancelled = false;    const load = async () => {      setLoadingDisputes(true);      try {        const rows = (await (escrowProgram.account as any).tradeAccount.all()) as { pubkey: PublicKey; account: any }[];        const disputed = rows.filter(r => {          const st = r.account.status as any; return st && st.disputed !== undefined;        });        if (!cancelled) setDisputes(disputed as any);      } catch (e) {        console.warn('failed to load disputes', e);        if (!cancelled) setDisputes([]);      } finally { if (!cancelled) setLoadingDisputes(false); }    };    void load();    const id = setInterval(() => void load(), 10_000);    return () => { cancelled = true; clearInterval(id); };  }, [escrowProgram, tab]);  // Fetch markets when market tab active  useEffect(() => {    if (!marketProgram || tab !== 'market') return;    let cancelled = false;    const load = async () => {      setLoadingMarkets(true);      try {        const rows = (await (marketProgram.account as any).marketAccount.all()) as { pubkey: PublicKey; account: any }[];        const now = Math.floor(Date.now() / 1000);        const toResolve = rows.filter(r => {          const st = r.account.status as any; return st && st.open !== undefined && (Number(r.account.resolution_time) || 0) <= now;        });        if (!cancelled) setMarkets(toResolve as any);      } catch (e) {        console.warn('failed to load markets', e);        if (!cancelled) setMarkets([]);      } finally { if (!cancelled) setLoadingMarkets(false); }    };    void load();    const id = setInterval(() => void load(), 10_000);    return () => { cancelled = true; clearInterval(id); };  }, [marketProgram, tab]);  // Admin resolve helper  async function handleAdminResolve(trade: { pubkey: PublicKey; account: any }, winner: string) {    if (!escrowProgram || !publicKey) return;    setBusy(true); setStatus(null);    try {      const tradeIdArr = toByteArray(trade.account.trade_id);      if (tradeIdArr.length === 0) throw new Error('invalid trade_id');      const tradeIdBuf = Buffer.from(tradeIdArr);      const [vaultPda] = PublicKey.findProgramAddressSync([Buffer.from('vault'), tradeIdBuf], ESCROW_PROGRAM_ID);      const [vaultAuth] = PublicKey.findProgramAddressSync([Buffer.from('authority')], ESCROW_PROGRAM_ID);      const winnerPub = new PublicKey(winner);      const winnerTokenAccount = await getAssociatedTokenAddress(new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'), winnerPub);      const tx = await (escrowProgram.methods as any).adminResolve(tradeIdArr, winnerPub).accounts({        admin: publicKey,        tradeAccount: trade.pubkey,        escrowVault: vaultPda,        vaultAuthority: vaultAuth,        winnerTokenAccount: winnerTokenAccount,        tokenProgram: TOKEN_PROGRAM_ID,      }).rpc();      setStatus(`SUCCESS: Resolved trade — tx: ${tx}`);      // refresh disputes list      const rows = (await (escrowProgram.account as any).tradeAccount.all()) as { pubkey: PublicKey; account: any }[];      setDisputes(rows.filter(r => { const st = r.account.status as any; return st && st.disputed !== undefined; }));    } catch (e: unknown) {      setStatus(`ERROR: ${e instanceof Error ? e.message : String(e)}`);      console.error(e);    } finally { setBusy(false); }  }  // Resolve market helper  async function handleResolveMarket(marketPubkey: PublicKey, outcome: boolean) {    if (!marketProgram || !publicKey) return;    setBusy(true); setStatus(null);    try {      const tx = await (marketProgram.methods as any).resolveMarket(outcome).accounts({ creator: publicKey, marketAccount: marketPubkey }).rpc();      setStatus(`SUCCESS: Market resolved — tx: ${tx}`);      const rows = (await (marketProgram.account as any).marketAccount.all()) as { pubkey: PublicKey; account: any }[];      const now = Math.floor(Date.now() / 1000);      setMarkets(rows.filter(r => { const st = r.account.status as any; return st && st.open !== undefined && (Number(r.account.resolution_time) || 0) <= now; }));    } catch (e: unknown) {      setStatus(`ERROR: ${e instanceof Error ? e.message : String(e)}`);    } finally { setBusy(false); }  }  if (!publicKey) {
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

  const tabs: { id: Tab; label: string }[] = [
    { id: "init", label: "Init Config" },
    { id: "verify", label: "Verify Vendor" },
    { id: "review", label: "Close Review" },
    { id: "disputes", label: "Disputes" },
    { id: "market", label: "Market Resolution" },
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
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", borderBottom: "1px solid var(--border)", paddingBottom: "1rem" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setTab(t.id); setStatus(null); }}
            style={{
              padding: "0.45rem 1rem",
              borderRadius: "var(--radius-pill)",
              border: `1px solid ${tab === t.id ? "var(--cyan)" : "var(--border)"}`,
              background: tab === t.id ? "var(--cyan-dim)" : "transparent",
              color: tab === t.id ? "var(--cyan)" : "var(--text-secondary)",
              fontWeight: tab === t.id ? 700 : 400,
              fontSize: "0.85rem",
              cursor: "pointer",
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
            background: status.startsWith("SUCCESS:") ? "rgba(52,211,153,0.08)" : "rgba(244,63,94,0.08)",
            border: `1px solid ${status.startsWith("SUCCESS:") ? "rgba(52,211,153,0.25)" : "rgba(244,63,94,0.2)"}`,
            borderRadius: "var(--radius-md)",
            padding: "0.85rem 1rem",
            color: status.startsWith("SUCCESS:") ? "var(--green)" : "var(--red)",
            fontSize: "0.82rem",
            marginBottom: "1.5rem",
            wordBreak: "break-all",
          }}
        >
          {status}
        </div>
      )}

      {/* Init Config */}
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

      {/* Verify Vendor */}
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

      {/* Close Review */}
      {tab === "review" && (
        <div className="glass" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.75rem" }}>
            Close (Delete) a Review
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: "1.25rem", lineHeight: 1.6 }}>
            Permanently closes an abusive <code>VendorReview</code> PDA and returns rent to the admin wallet. Paste the review account public key below.
          </p>          <div className="form-group" style={{ marginBottom: "1.25rem" }}>            <label className="form-label">Review Account Pubkey</label>            <input className="form-input" type="text" placeholder="Base58 public key…" value={reviewAddress} onChange={(e) => setReviewAddress(e.target.value)} />          </div>          <button className="btn-primary" onClick={handleCloseReview} disabled={busy || !reviewAddress.trim()}>{busy ? "Sending…" : "Close Review"}</button>        </div>      )}      {/* Disputes */}      {tab === "disputes" && (        <div className="glass" style={{ padding: "1.5rem" }}>          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.75rem" }}><Gavel size={18} /> Disputed Trades</h2>          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: "1rem" }}>List of trades currently in Disputed state. Admin may resolve in favor of buyer or seller.</p>          {loadingDisputes ? (            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading...</div>          ) : disputes.length === 0 ? (            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No disputes found.</div>          ) : (            <div style={{ display: 'grid', gap: '0.75rem' }}>{disputes.map(d => (              <div key={d.pubkey.toBase58()} style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>                <div>                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{Buffer.from(toByteArray(d.account.trade_id || [])).toString('hex')}</div>                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Buyer: <span className="addr">{(d.account.buyer as PublicKey)?.toBase58?.() ?? String(d.account.buyer)}</span> • Seller: <span className="addr">{(d.account.seller as PublicKey)?.toBase58?.() ?? String(d.account.seller)}</span></div>                </div>                <div style={{ display: 'flex', gap: '0.5rem' }}>                  <button className="btn-ghost" disabled={busy} onClick={() => void handleAdminResolve(d, String(d.account.buyer))}>Settle for Buyer</button>                  <button className="btn-primary" disabled={busy} onClick={() => void handleAdminResolve(d, String(d.account.seller))}>Settle for Seller</button>                </div>              </div>            ))}</div>          )}        </div>      )}      {/* Market Resolution */}      {tab === "market" && (        <div className="glass" style={{ padding: "1.5rem" }}>          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.75rem" }}><Scale size={18} /> Market Resolution</h2>          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: "1rem" }}>Open markets past their resolution time are shown here. The creator may resolve; admin may call resolve if needed.</p>          {loadingMarkets ? (            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading...</div>          ) : markets.length === 0 ? (            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No markets to resolve.</div>          ) : (            <div style={{ display: 'grid', gap: '0.75rem' }}>{markets.map(m => (              <div key={m.pubkey.toBase58()} style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>                <div>                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{String(m.account.question ?? m.pubkey.toBase58())}</div>                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Resolves at: {new Date(Number(m.account.resolution_time) * 1000).toLocaleString()}</div>                </div>                <div style={{ display: 'flex', gap: '0.5rem' }}>                  <button className="btn-ghost" disabled={busy} onClick={() => void handleResolveMarket(m.pubkey, true)}>Outcome: YES</button>                  <button className="btn-primary" disabled={busy} onClick={() => void handleResolveMarket(m.pubkey, false)}>Outcome: NO</button>                </div>              </div>            ))}</div>          )}        </div>      )}
    </main>
  );
}
