'use client';

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";
import { ClipboardList, Wallet, Store, Building2, AlertCircle, Heart } from "lucide-react";
import { useTradeSync } from "@/context/TradeContext";
import { useBuyerOrders } from "@/hooks/useBuyerOrders";
import { getStatusMeta } from "@/lib/tradeStatus";
import { SettlementStatusBadge, SettlementFlowViewer } from "@/components/SettlementStatus";

interface UserProfile {
  id: number;
  wallet_address: string;
  user_type: string;
  username: string;
  reputation_score: number;
  kyc_status: string;
  created_at: string;
}

interface TradeRow {
  pubkey: any;
  account: any;
}

const API = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8080";

// ============= SKELETON COMPONENTS =============
const SkeletonLine = ({ w = "w-24", h = "h-3" }: { w?: string; h?: string }) => (
  <div className={`${h} ${w} bg-white/8 rounded animate-pulse`} />
);

const SkeletonText = () => <SkeletonLine w="w-32" h="h-2.5" />;
const SkeletonRow = () => (
  <div className="flex items-center justify-between">
    <SkeletonText />
    <SkeletonText />
  </div>
);

function bytesToHex(value: unknown): string | null {
  if (value instanceof Uint8Array) {
    return Array.from(value)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  if (Array.isArray(value) && value.every((item) => typeof item === "number")) {
    return value
      .map((byte) => Number(byte).toString(16).padStart(2, "0"))
      .join("");
  }

  return null;
}

function shortRef(value: string): string {
  if (value.length <= 18) return value;
  return `${value.slice(0, 6)}…${value.slice(-6)}`;
}

function formatOrderReference(order: TradeRow, index: number): string {
  const rawId = order.account?.trade_id ?? order.account?.id ?? order.account?.tradeId;
  const tradeId = typeof rawId === "string" ? rawId : bytesToHex(rawId);
  if (tradeId) return shortRef(tradeId);

  const pubkey = order.pubkey?.toBase58?.();
  if (typeof pubkey === "string" && pubkey.length > 0) {
    return shortRef(pubkey);
  }

  return `Order #${index + 1}`;
}

function toDateMs(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1_000_000_000_000 ? value : value * 1000;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (/^\d+$/.test(trimmed)) {
      const numeric = Number(trimmed);
      return Number.isFinite(numeric)
        ? (numeric > 1_000_000_000_000 ? numeric : numeric * 1000)
        : null;
    }

    const parsed = Date.parse(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function formatOrderDate(value: unknown): string {
  const ms = toDateMs(value);
  return ms ? new Date(ms).toLocaleDateString() : "Pending timestamp";
}

// ============= MAIN COMPONENT =============
export default function UserDashboardPage() {
  const { publicKey } = useWallet();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState<number | null>(null);

  const wallet = publicKey?.toBase58();
  const { refreshKey } = useTradeSync();
  const { orders } = useBuyerOrders(refreshKey);

  useEffect(() => {
    if (!wallet) {
      setLoading(false);
      return;
    }

    const init = async () => {
      try {
        // Upsert user on login
        await fetch(`${API}/api/users/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet_address: wallet, user_type: "buyer" }),
        });

        // Fetch user profile
        const res = await fetch(`${API}/api/users/${wallet}`);
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        }

        // Try to fetch follower/review counts from localStorage (demo data)
        try {
          const storedFollowers = localStorage.getItem("aether_followed_stores");
          if (storedFollowers) {
            setFollowerCount(JSON.parse(storedFollowers).length);
          } else {
            setFollowerCount(0);
          }
        } catch {
          setFollowerCount(0);
        }

        // Demo: use orders count as approximation for reviews
        setReviewCount(Math.max(0, orders.length - 1));
      } catch {
        /* offline */
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [wallet, orders.length]);

  if (!publicKey) {
    return (
      <main style={{ textAlign: "center", paddingTop: "4rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem", opacity: 0.5 }}>◉</div>
        <h2 style={{ color: "var(--foreground)", marginBottom: "0.5rem", fontSize: "1.125rem", fontWeight: 600 }}>
          My Account
        </h2>
        <p style={{ color: "#9CA3AF", marginBottom: "1.5rem", fontSize: "0.8125rem" }}>
          Connect your wallet to access your account.
        </p>
        <WalletMultiButton />
      </main>
    );
  }

  // ============= QUICK ACTIONS =============
  const quickActions = [
    { href: "/user/orders", label: "View Orders", icon: ClipboardList },
    { href: "/user/wallet", label: "Wallet", icon: Wallet },
    { href: "/marketplace", label: "Shop Now", icon: Store },
    { href: "/vendor/stores", label: "My Stores", icon: Building2 },
  ];

  // ============= REPUTATION COLOR LOGIC =============
  const reputationColor = user
    ? user.reputation_score >= 4.0
      ? "#22C55E"
      : user.reputation_score >= 2.0
        ? "#FBBF24"
        : user.reputation_score > 0
          ? "#EF4444"
          : "#6B7280"
    : "#6B7280";

  return (
    <div>
      {/* PROFILE HEADER ROW */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          paddingBottom: "1.25rem",
          marginBottom: "1.5rem",
        }}
      >
        {loading ? (
          <div style={{ width: 48, height: 48, background: "#1F2937", borderRadius: "50%", animation: "pulse 2s infinite" }} />
        ) : (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "#1F2937",
              border: "2px solid rgba(96,165,250,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.25rem",
              fontWeight: 900,
              color: "#93C5FD",
              flexShrink: 0,
            }}
          >
            {(user?.username || "A")[0]?.toUpperCase()}
          </div>
        )}

        <div style={{ flex: 1 }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <SkeletonLine w="w-32" />
              <SkeletonLine w="w-48" h="h-2" />
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--foreground)", marginBottom: "0.25rem" }}>
                {user?.username || "Anonymous"}
              </h1>
              <div style={{ fontSize: "0.6875rem", color: "#6B7280", fontFamily: "monospace" }}>
                {wallet?.slice(0, 8)}…{wallet?.slice(-8)}
              </div>
            </>
          )}
        </div>

        {/* Right side: badges + button */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexShrink: 0 }}>
          {loading ? (
            <>
              <SkeletonLine w="w-16" h="h-5" />
              <SkeletonLine w="w-20" h="h-5" />
            </>
          ) : (
            <>
              <span
                style={{
                  padding: "0.25rem 0.65rem",
                  background: "rgba(6,182,212,0.15)",
                  color: "#22D3EE",
                  borderRadius: "9999px",
                  fontSize: "0.625rem",
                  fontWeight: 600,
                  border: "1px solid rgba(6,182,212,0.3)",
                  textTransform: "capitalize",
                }}
              >
                {user?.user_type ?? "buyer"}
              </span>

              {/* KYC Badge with Warning */}
              <div
                title="Complete KYC to unlock trade limits"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.35rem 0.65rem",
                  background: "rgba(249,115,22,0.15)",
                  color: "#FB923C",
                  border: "1px solid rgba(249,115,22,0.3)",
                  borderRadius: "9999px",
                  fontSize: "0.625rem",
                  fontWeight: 600,
                }}
              >
                <AlertCircle size={12} />
                KYC: {user?.kyc_status ?? "none"}
              </div>

              <Link
                href="/user/profile"
                style={{
                  padding: "0.35rem 0.75rem",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#9CA3AF",
                  borderRadius: "0.5rem",
                  fontSize: "0.75rem",
                  textDecoration: "none",
                  cursor: "pointer",
                  transition: "all 150ms ease",
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLAnchorElement).style.background = "rgba(255,255,255,0.1)";
                  (e.target as HTMLAnchorElement).style.color = "var(--foreground)";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLAnchorElement).style.background = "transparent";
                  (e.target as HTMLAnchorElement).style.color = "#9CA3AF";
                }}
              >
                Edit Profile
              </Link>
            </>
          )}
        </div>
      </div>

      {/* SETTLEMENT STATUS SECTION */}
      <div style={{ marginBottom: "1.5rem" }}>
        <SettlementStatusBadge />
        <SettlementFlowViewer />
      </div>

      {/* STATS ROW (4 columns) */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          marginBottom: "1.5rem",
        }}
      >
        {[
          { label: "Reputation", value: loading ? "—" : user?.reputation_score?.toFixed(1) ?? "0.0", color: reputationColor },
          { label: "Member Since", value: loading ? "—" : user?.created_at ? new Date(user.created_at).getFullYear().toString() : "–" },
          { label: "Total Orders", value: loading ? "—" : orders.length.toString() },
          { label: "Wallet Balance", value: "—" },
        ].map((stat, idx) => (
          <div
            key={stat.label}
            style={{
              flex: 1,
              padding: "1.5rem",
              borderRight: idx < 3 ? "1px solid rgba(255,255,255,0.08)" : "none",
            }}
          >
            <div style={{ fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.12em", color: "#6B7280", textTransform: "uppercase", marginBottom: "0.5rem" }}>
              {stat.label}
            </div>
            <div
              style={{
                fontSize: "1.875rem",
                fontWeight: 900,
                color: stat.color || "var(--foreground)",
              }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* QUICK ACTIONS */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--foreground)", marginBottom: "0.75rem" }}>
          Quick Actions
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  padding: "1rem",
                  borderRadius: "0.75rem",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  textDecoration: "none",
                  transition: "all 150ms ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = "rgba(255,255,255,0.06)";
                  el.style.borderColor = "rgba(255,255,255,0.15)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = "rgba(255,255,255,0.03)";
                  el.style.borderColor = "rgba(255,255,255,0.08)";
                }}
              >
                <Icon size={28} style={{ color: "#60A5FA" }} />
                <span style={{ fontSize: "0.75rem", color: "#9CA3AF", fontWeight: 500 }}>
                  {action.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* MAIN CONTENT: 2 COLUMNS */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 18rem", gap: "1.5rem" }}>
        {/* RECENT ORDERS */}
        <div>
          <h2 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--foreground)", marginBottom: "0.75rem" }}>
            Recent Orders
          </h2>
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "0.75rem",
              background: "rgba(255,255,255,0.03)",
              overflow: "hidden",
            }}
          >
            {loading ? (
              <div style={{ padding: "1.5rem" }}>
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    style={{
                      marginBottom: i < 2 ? "1rem" : 0,
                      paddingBottom: i < 2 ? "1rem" : 0,
                      borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.08)" : "none",
                    }}
                  >
                    <SkeletonRow />
                    <SkeletonText />
                  </div>
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div style={{ padding: "1.5rem", textAlign: "center" }}>
                <div style={{ fontSize: "0.8125rem", color: "#9CA3AF", marginBottom: "0.75rem" }}>
                  No orders yet — let's get started!
                </div>
                <Link
                  href="/marketplace"
                  style={{
                    display: "inline-block",
                    padding: "0.35rem 0.75rem",
                    background: "#3B82F6",
                    color: "var(--foreground)",
                    borderRadius: "0.5rem",
                    fontSize: "0.75rem",
                    textDecoration: "none",
                    transition: "all 150ms ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background = "#2563EB";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background = "#3B82F6";
                  }}
                >
                  Shop Now →
                </Link>
              </div>
             ) : (
               <div>
                 {orders.slice(0, 5).map((order, idx) => {
                   const meta = getStatusMeta(order.account?.status);

                   return (
                     <div
                       key={idx}
                       style={{
                         padding: "1rem 1.5rem",
                         borderBottom: idx < Math.min(4, orders.length - 1) ? "1px solid rgba(255,255,255,0.08)" : "none",
                         display: "flex",
                         justifyContent: "space-between",
                         alignItems: "center",
                       }}
                     >
                       <div>
                         <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--foreground)", fontFamily: "monospace" }}>
                           {formatOrderReference(order, idx)}
                         </div>
                         <div style={{ fontSize: "0.6875rem", color: "#6B7280", marginTop: "0.25rem" }}>
                           {formatOrderDate(order.account?.created_at)}
                         </div>
                       </div>
                       <div
                         style={{
                           padding: "0.25rem 0.6rem",
                           background: meta.bg,
                           color: meta.color,
                           borderRadius: "0.375rem",
                           fontSize: "0.625rem",
                           fontWeight: 600,
                           border: `1px solid ${meta.color}30`,
                         }}
                       >
                         {meta.label}
                       </div>
                     </div>
                   );
                 })}
               </div>
             )}
           </div>
        </div>

        {/* ACCOUNT STATUS */}
        <div>
          <h2 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--foreground)", marginBottom: "0.75rem" }}>
            Account Status
          </h2>
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "0.75rem",
              background: "rgba(255,255,255,0.03)",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            {loading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : (
              <>
                {/* KYC Status */}
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#9CA3AF", marginBottom: "0.35rem" }}>
                    KYC Status
                  </div>
                  {user?.kyc_status === "verified" ? (
                    <div style={{ fontSize: "0.8125rem", color: "#22C55E", fontWeight: 500 }}>
                      ✓ Verified
                    </div>
                  ) : (
                    <Link
                      href="/user/profile"
                      style={{
                        display: "inline-block",
                        fontSize: "0.8125rem",
                        color: "#FB923C",
                        textDecoration: "none",
                        cursor: "pointer",
                        transition: "color 150ms ease",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLAnchorElement).style.color = "#FED7AA";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLAnchorElement).style.color = "#FB923C";
                      }}
                    >
                      Complete KYC →
                    </Link>
                  )}
                </div>

                {/* Followed Stores */}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "1rem" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#9CA3AF", marginBottom: "0.35rem" }}>
                    Followed Stores
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--foreground)" }}>
                    {followerCount !== null ? followerCount : "—"}
                  </div>
                </div>

                {/* Reviews Given */}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "1rem" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#9CA3AF", marginBottom: "0.35rem" }}>
                    Reviews Given
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--foreground)" }}>
                    {reviewCount !== null ? reviewCount : "—"}
                  </div>
                </div>

                {/* Admin Shortcut */}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "1rem" }}>
                   <Link
                      href="/admin"
                      style={{
                        display: "inline-block",
                        fontSize: "0.8125rem",
                        color: "var(--cyan)",
                        textDecoration: "none",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Admin Panel →
                    </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
