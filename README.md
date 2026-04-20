# ⚡ AETHER-LOGOS

**Asset-Light Trade Settlement Protocol on Solana**

> Built for the [Solana Frontier Hackathon 2026](https://www.colosseum.org). Eliminates the **$2.5 trillion** global trade finance gap using zkTLS proofs and atomic escrow settlement — without deploying new hardware or creating new data pipelines.

[![Built on Solana](https://img.shields.io/badge/Built%20on-Solana-9945FF?style=flat-square&logo=solana)](https://solana.com)
[![Anchor](https://img.shields.io/badge/Anchor-0.32-blue?style=flat-square)](https://www.anchor-lang.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

## 🌍 The Problem

Global trade finance is broken:

- **$2.5T financing gap** — Small exporters in emerging markets can't access trade credit
- **Paper-based trust** — Bills of lading, invoices, and proof-of-delivery still rely on faxes and manual verification
- **Escrow friction** — Cross-border payments are locked for weeks because there's no trustless way to verify delivery
- **Opaque risk** — No liquid market exists to hedge against shipment delays, losses, or defaults

## 💡 The Solution

**AETHER-LOGOS** converts existing logistics data from global carriers (DHL, FedEx, UPS, Maersk) into on-chain cryptographic **Proofs of Custody** using **zkTLS** via [Reclaim Protocol](https://reclaimprotocol.org). These proofs drive:

1. **Atomic escrow releases** — USDC is locked in a PDA vault and automatically released when delivery is cryptographically verified
2. **Decentralized prediction markets** — A parimutuel AMM ("Polymarket for trade risk") lets anyone hedge logistics risk

**No new hardware. No new data.** Uses the logistics rail that already covers **220+ countries**.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      AETHER-LOGOS Protocol                       │
├────────────────┬───────────────┬────────────────┬────────────────┤
│   Layer A      │   Layer B     │   Layer C      │   Layer D      │
│   Trade        │   zkTLS       │   Prediction   │   Agentic      │
│   Escrow       │   Verifier    │   Market       │   Backend      │
│   (Anchor)     │   (Reclaim)   │   (Anchor)     │   (Golang)     │
├────────────────┴───────────────┴────────────────┴────────────────┤
│                        Solana Blockchain                         │
│               SPL Token  ·  Token-2022  ·  PDA Vaults            │
└──────────────────────────────────────────────────────────────────┘
         ▲                                          ▲
         │  Anchor IDL / JSON-RPC                   │  REST + WebSocket
         │                                          │
   ┌─────┴──────┐                            ┌──────┴──────┐
   │  Next.js   │                            │  Go Agent   │
   │  Frontend  │◄── Wallet Adapter ──►      │  (Polling   │
   │  (React)   │                            │  + Proofs)  │
   └────────────┘                            └─────────────┘
```

---

## 📦 Core Components

### 🦀 Trade Escrow Program — `programs/trade-escrow/`

Anchor program (661 lines of Rust) managing USDC escrow with milestone-based release and a full trade lifecycle state machine.

#### State Machine

```
                        create_trade
                     (buyer locks USDC)
                            │
                            ▼
                  ┌─────────────────────┐
                  │  AwaitingShipment   │
                  └─────────┬───────────┘
                 ╱          │          ╲
    cancel_trade           submit_tracking     open_dispute
  (after 48h deadline)     (seller provides     (buyer/seller)
         │                  tracking ID)             │
         ▼                      │                    ▼
   ┌───────────┐                ▼              ┌───────────┐
   │ Cancelled │      ┌─────────────────┐      │ Disputed  │
   └───────────┘      │   InTransit     │      └─────┬─────┘
                      └────────┬────────┘            │
                   ╱           │                admin_resolve
              open_dispute   submit_proof       (winner gets USDC)
                   │     (zkTLS delivery         │
                   ▼       proof)                ▼
             ┌───────────┐     │          ┌───────────┐
             │ Disputed  │     ▼          │ Released  │
             └───────────┘ ┌──────────┐   └───────────┘
                           │ Verified │
                           └────┬─────┘
                                │
                          release_funds
                       (permissionless)
                                │
                                ▼
                         ┌───────────┐
                         │ Released  │
                         └───────────┘
```

#### Instructions

| Instruction | Signer | Description |
|-------------|--------|-------------|
| `create_trade` | Buyer | Deposits USDC into a PDA vault. Sets a 48-hour shipping deadline. Optionally attaches an IPFS invoice CID. |
| `submit_tracking` | Seller | Provides tracking ID and carrier (DHL/FedEx/UPS/Maersk/USPS). Must be submitted before the shipping deadline. |
| `submit_proof` | Any | Submits proof data (≥32 bytes). Verifies milestone. Extracts `signed_by` field if delivery signature is required. |
| `release_funds` | Any | Transfers USDC from the escrow vault to the seller's token account. Permissionless once status is `Verified`. |
| `cancel_trade` | Buyer | Returns escrowed USDC to the buyer if the seller failed to ship within the 48-hour deadline. |
| `open_dispute` | Buyer or Seller | Moves the trade into `Disputed` status. Buyer can dispute at any time; seller only after the deadline passes. |
| `admin_resolve` | Admin | Resolves a dispute by transferring funds to the declared winner (buyer or seller). |

#### On-Chain Account — `TradeAccount`

```rust
pub struct TradeAccount {
    pub trade_id: [u8; 32],            // Unique 32-byte trade identifier
    pub buyer: Pubkey,                 // Buyer's wallet address
    pub seller: Pubkey,                // Seller's wallet address
    pub amount: u64,                   // USDC amount (6 decimals)
    pub milestone_hash: [u8; 32],      // Expected milestone hash for verification
    pub milestone_verified: bool,      // True after zkTLS proof is accepted
    pub proof_data: Vec<u8>,           // Raw proof bytes (zkTLS or SHA256)
    pub tracking_id: Option<String>,   // Carrier tracking number (max 64 chars)
    pub carrier: Option<Carrier>,      // DHL | FedEx | UPS | Maersk | USPS
    pub seller_notified: bool,         // Whether seller acknowledged the order
    pub order_created_at: i64,         // Unix timestamp of creation
    pub ship_by_deadline: i64,         // order_created_at + 48 hours
    pub shipped_at: Option<i64>,       // Unix timestamp when seller shipped
    pub signature_required: bool,      // Whether delivery requires a signature
    pub signed_by: Option<String>,     // Name of person who signed on delivery
    pub invoice_cid: Option<String>,   // IPFS CID of the invoice document
    pub status: TradeStatus,           // Current state in the lifecycle
    pub bump: u8,                      // PDA bump seed
}
```

#### PDA Seeds

| PDA | Seeds | Purpose |
|-----|-------|---------|
| Trade Account | `["trade", buyer_pubkey, trade_id]` | Stores all trade state and metadata |
| Escrow Vault | `["vault", trade_id]` | SPL Token account holding escrowed USDC |
| Vault Authority | `["authority"]` | Global PDA signer for all vault transfers |

---

### 📈 Prediction Market — `programs/prediction-market/`

A **parimutuel prediction market** (545 lines of Rust) for hedging trade risk — think "Polymarket for global logistics."

#### Instructions

| Instruction | Signer | Description |
|-------------|--------|-------------|
| `create_market` | Creator | Opens a hedge market linked to a shipment digital twin. Sets question (≤128 chars), resolution time, and protocol fee (≤10%). |
| `place_hedge` | User | Stakes USDC on the Yes or No side of a market. Creates a position PDA on first call (init-if-needed). Subsequent stakes must be on the same side. |
| `resolve_market` | Creator | Declares the outcome (`true` = Yes won, `false` = No won). Only callable after the resolution time has passed. |
| `claim_winnings` | Winner | Claims proportional winnings from the total pool. |

#### Payout Formula

```
user_payout = (user_stake × total_pool) ÷ winning_side_total
```

Example: If you stake 100 USDC on "Yes" (total Yes pool = 500 USDC, total No pool = 300 USDC), and Yes wins:
```
payout = (100 × 800) ÷ 500 = 160 USDC  (+60 USDC profit)
```

#### PDA Seeds

| PDA | Seeds | Purpose |
|-----|-------|---------|
| Market Account | `["market", shipment_twin]` | Market state (totals, outcome, status) |
| Hedge Position | `["position", market_key, user_key]` | User's stake (side, amount, claimed) |
| Market Vault | `["market_vault", market_key]` | Token account holding staked USDC |
| Market Authority | `["market_authority", market_key]` | PDA signer for vault transfers |

---

### 🔐 zkTLS Verification — Reclaim Protocol

AETHER-LOGOS uses [Reclaim Protocol](https://reclaimprotocol.org) for **software-only oracles** via zkTLS. This allows the agent to cryptographically prove that a carrier's website (e.g., DHL tracking page) shows a "Delivered" status — without leaking API credentials or trusting a centralized oracle.

**How it works:**

1. Agent detects delivery status change from carrier API
2. Agent creates a verification request with Reclaim Protocol
3. Reclaim's decentralized witnesses attest to the TLS session data
4. The resulting proof is serialized and submitted on-chain
5. The escrow program verifies the proof and transitions to `Verified`

**Fallback:** When Reclaim credentials aren't configured, the system falls back to a SHA256 hash of the delivery data (for development/testing).

---

### 🤖 Agentic Backend — `agent/`

A lightweight Go microservice (~900 lines) that autonomously monitors carrier APIs, detects shipment status changes, generates cryptographic proofs, and submits them on-chain.

#### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/register` | Register a shipment for automated monitoring |
| `GET` | `/poll` | Manually trigger a poll cycle across all pending shipments |
| `POST` | `/notify` | Receive/send webhook notifications on status changes |
| `GET` | `/api/tracking/:id` | Get full tracking data + milestone history for a shipment |
| `GET` | `/health` | Health check → `{"status": "ok"}` |

#### Registration Payload

```json
{
  "tracking_id": "1Z999AA10123456784",
  "wallet": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "callback_url": "https://merchant.example.com/webhook",
  "carrier": "dhl",
  "trade_account": "Fg6PaF...",
  "trade_id": "0xabcdef..."
}
```

#### Background Polling Loop

The agent runs a background goroutine (configurable interval, default 30s) that:

1. **Queries** all shipments where `proof_tx_sig = ''` (not yet proven)
2. **Fetches** full tracking data from DHL API (with milestone history)
3. **Upserts** milestone events into the local SQLite database
4. **Detects** status transitions and sends webhook notifications
5. **On delivery with signature:**
   - Attempts **zkTLS proof** via Reclaim Protocol
   - Falls back to **SHA256 proof** if Reclaim is unavailable
   - **Submits proof on-chain** to the trade escrow program via Solana RPC

#### Architecture

| File | Purpose |
|------|---------|
| `main.go` | Entry point — HTTP server, route registration, background poller |
| `handlers.go` | HTTP handlers, poll cycle logic, delivery confirmation flow |
| `db.go` | SQLite persistence layer (shipments + milestones tables) |
| `carrier.go` | Mock carrier status progression (for development) |
| `carrier/dhl.go` | DHL Tracking API client with full milestone parsing |
| `proof/reclaim.go` | SHA256 fallback proof generation |
| `proof/reclaim_zktls.go` | Full Reclaim Protocol zkTLS integration |
| `proof/solana_submitter.go` | Builds and submits Solana transactions for on-chain proof |

---

### 🖥️ Frontend Dashboard — `app/`

A **Next.js 15** application with React 19, providing separate buyer and seller dashboards with Solana wallet integration.

#### Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page — "I'm a Buyer" / "I'm a Seller" navigation, protocol overview |
| `/trades` | **Trade Escrow Dashboard** — Create trades, view active trades, release funds, cancel, or dispute |
| `/markets` | **Hedge Markets** — Place Yes/No hedges with live odds display |
| `/dashboard/buyer` | **Buyer Dashboard** — Track shipment progress with visual timeline, release funds, open disputes |
| `/dashboard/seller` | **Seller Dashboard** — View new orders, submit tracking info, monitor active shipments |

#### API Routes

| Route | Description |
|-------|-------------|
| `GET /api/trades?buyer=...` | Fetches trade program accounts from Solana RPC |
| `GET /api/markets` | Returns open prediction markets |
| `POST /api/upload` | Uploads invoice files to IPFS via [Pinata](https://pinata.cloud) |

#### Key Components

| Component | Purpose |
|-----------|---------|
| `SolanaWalletProvider` | Wraps app with Phantom + Solflare wallet adapters (devnet) |
| `useAnchorClient` hook | Creates `AnchorProvider` + `Program` instances for both programs |
| `useBuyerOrders` / `useSellerOrders` | Polls all trade account PDAs every 10 seconds, filters by wallet |
| `useTradeAccount` | Fetches a single trade account with WebSocket subscription for live updates |
| `OrderCard` | Displays trade info with color-coded status badges |
| `TrackingTimeline` | Visual step indicator (✅ ⏳ ⬜) for shipment progress |
| `InvoiceUpload` | File upload → IPFS via Pinata → CID stored on-chain |

---

## 🔄 End-to-End User Flow

```
┌─────────┐                    ┌──────────────┐                  ┌─────────┐
│  BUYER  │                    │   SOLANA     │                  │  SELLER │
└────┬────┘                    │  BLOCKCHAIN  │                  └────┬────┘
     │                         └──────┬───────┘                       │
     │  1. Create trade (lock USDC)   │                               │
     │───────────────────────────────►│                               │
     │                                │  OrderCreated event           │
     │                                │──────────────────────────────►│
     │                                │                               │
     │                                │  2. Submit tracking ID        │
     │                                │◄──────────────────────────────│
     │                                │                               │
     │                         ┌──────┴───────┐                       │
     │                         │  GO AGENT    │                       │
     │                         └──────┬───────┘                       │
     │                                │                               │
     │                 3. Poll DHL API every 30s                      │
     │                                │                               │
     │                 4. Delivery confirmed ✓                        │
     │                                │                               │
     │                 5. Generate zkTLS proof                        │
     │                                │                               │
     │                 6. Submit proof on-chain                       │
     │                                │                               │
     │                         ┌──────┴───────┐                       │
     │                         │   SOLANA     │                       │
     │                         └──────┬───────┘                       │
     │                                │                               │
     │  7. Release funds              │  USDC transferred to seller   │
     │───────────────────────────────►│──────────────────────────────►│
     │                                │                               │
     │  8. (Optional) Hedge market    │                               │
     │     resolved, winners claim    │                               │
     └────────────────────────────────┘                               │
```

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Rust | 1.75+ | Compile Solana programs |
| Anchor CLI | 0.32+ | Build/test/deploy Anchor programs |
| Solana CLI | 1.18+ | Key management, local validator |
| Node.js | 18+ | Frontend + test runner |
| Go | 1.22+ | Agent backend |

### 1. Clone & Build

```bash
# Clone the repository
git clone https://github.com/lucaz719/AETHER-LOGOS.git
cd AETHER-LOGOS

# Build Solana programs
anchor build

# Run integration tests
anchor test
```

### 2. Start the Frontend

```bash
cd app
npm install
npm run dev
# → http://localhost:3000
```

### 3. Start the Agent

```bash
cd agent
go run .
# → http://localhost:8080
```

### 4. Environment Configuration

Copy the example env files and fill in your keys:

```bash
# Root environment (Solana + Reclaim)
cp .env.example .env

# Agent environment
cp agent/.env.example agent/.env

# Frontend environment (optional)
cp app/.env.local.example app/.env.local
```

#### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SOLANA_RPC_URL` | No | Solana RPC endpoint (default: devnet) |
| `ANCHOR_WALLET` | Yes | Path to Solana keypair JSON |
| `RECLAIM_APP_ID` | No | Reclaim Protocol app ID (for zkTLS proofs) |
| `RECLAIM_APP_SECRET` | No | Reclaim Protocol app secret |
| `DHL_API_KEY` | No | DHL Tracking API key |
| `PINATA_API_KEY` | No | Pinata IPFS pinning API key |
| `PINATA_SECRET_KEY` | No | Pinata IPFS pinning secret |
| `TRADE_ESCROW_PROGRAM_ID` | No | Deployed escrow program ID |
| `SOLANA_PRIVATE_KEY_BASE58` | No | Agent's payer private key (Base58) |

---

## 🧪 Testing

### Trade Escrow Tests (Fully Implemented)

```bash
anchor test
```

| Test Case | Status |
|-----------|--------|
| Buyer creates order → status `AwaitingShipment` | ✅ |
| Seller submits tracking → status `InTransit` | ✅ |
| Wrong seller submits tracking → `Unauthorized` error | ✅ |
| Cancel trade before deadline → `ShipDeadlineNotPassed` error | ✅ |
| Full happy path: create → tracking → proof → release | ✅ |
| Dispute from `InTransit` status → `Disputed` | ✅ |

### Prediction Market Tests (Scaffold)

The prediction market test suite is scaffolded with 7 test cases ready for implementation after deployment.

---

## 🛡️ Security Considerations

- **PDA-signed transfers** — All vault operations use Program Derived Addresses; no private keys involved in fund movement
- **USDC mint validation** — The escrow program hardcodes the accepted USDC mint address
- **Checked arithmetic** — All math operations use `.checked_add()`, `.checked_mul()`, `.checked_div()` to prevent overflow
- **Deadline enforcement** — 48-hour shipping window with on-chain timestamp validation
- **Double-claim prevention** — Prediction market positions have a `claimed` flag
- **Bump seed verification** — All PDA operations verify expected bump seeds
- **Authorization checks** — Seller identity verified before tracking submission; only market creators can resolve

---

## 📁 Project Structure

```
AETHER-LOGOS/
├── programs/
│   ├── trade-escrow/                   # Core escrow Anchor program (Rust)
│   │   ├── Cargo.toml                  # Crate config with feature flags
│   │   └── src/lib.rs                  # 661 lines — full state machine
│   └── prediction-market/              # Hedge market Anchor program (Rust)
│       ├── Cargo.toml
│       └── src/lib.rs                  # 545 lines — parimutuel AMM
│
├── agent/                              # Go shipping monitor agent
│   ├── main.go                         # Entry point, HTTP server, poller
│   ├── handlers.go                     # HTTP handlers, poll cycle, delivery flow
│   ├── db.go                           # SQLite persistence (shipments + milestones)
│   ├── carrier.go                      # Mock carrier status progression
│   ├── carrier/
│   │   └── dhl.go                      # DHL Tracking API client
│   ├── proof/
│   │   ├── reclaim.go                  # SHA256 fallback proof generator
│   │   ├── reclaim_zktls.go            # Reclaim Protocol zkTLS integration
│   │   └── solana_submitter.go         # Builds + submits Solana transactions
│   ├── go.mod / go.sum
│   └── README.md
│
├── app/                                # Next.js 15 frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                # Landing page
│   │   │   ├── layout.tsx              # Root layout with wallet provider
│   │   │   ├── trades/page.tsx         # Trade escrow management
│   │   │   ├── markets/page.tsx        # Prediction market hedging
│   │   │   ├── dashboard/
│   │   │   │   ├── buyer/page.tsx      # Buyer dashboard with timeline
│   │   │   │   └── seller/page.tsx     # Seller dashboard with tracking
│   │   │   └── api/
│   │   │       ├── trades/route.ts     # Trade account API
│   │   │       ├── markets/route.ts    # Markets API
│   │   │       └── upload/route.ts     # IPFS invoice upload
│   │   ├── components/
│   │   │   ├── OrderCard.tsx           # Status-colored trade card
│   │   │   ├── TrackingTimeline.tsx    # Visual milestone tracker
│   │   │   └── InvoiceUpload.tsx       # IPFS file upload
│   │   ├── hooks/
│   │   │   ├── useAnchorClient.ts      # Anchor provider + program setup
│   │   │   ├── useBuyerOrders.ts       # Auto-refreshing buyer orders
│   │   │   ├── useSellerOrders.ts      # Auto-refreshing seller orders
│   │   │   └── useTradeAccount.ts      # Single trade with WebSocket
│   │   └── lib/
│   │       ├── anchor.ts              # Program initialization
│   │       ├── wallet-provider.tsx     # Phantom + Solflare setup
│   │       └── idl/                   # Generated Anchor IDLs
│   ├── package.json
│   └── tsconfig.json
│
├── tests/
│   ├── trade-escrow.ts                 # 6 integration tests (fully implemented)
│   └── prediction-market.ts            # 7 test scaffolds
│
├── migrations/deploy.ts                # Anchor deployment script
├── Anchor.toml                         # Anchor workspace config
├── Cargo.toml                          # Rust workspace (2 members)
├── .env.example                        # Environment template
└── README.md                           # This file
```

---

## ⚙️ Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| **Blockchain** | Solana | Devnet → Mainnet |
| **Smart Contracts** | Rust + Anchor | 0.32 |
| **Token Standard** | SPL Token + Token-2022 | Latest |
| **Oracle** | zkTLS via Reclaim Protocol | v1 |
| **Frontend** | Next.js + React + TypeScript | 15 / 19 / 5 |
| **Agent Backend** | Go + SQLite | 1.22 |
| **Wallet** | Phantom + Solflare (wallet-adapter) | Latest |
| **IPFS** | Pinata | v2 |
| **Carrier API** | DHL Tracking API | MyDHL API |

---

## 🗺️ Roadmap

- [x] Trade escrow program with full state machine
- [x] Prediction market with parimutuel payout
- [x] Go agent with DHL integration and background polling
- [x] zkTLS proof generation via Reclaim Protocol
- [x] On-chain proof submission from agent
- [x] Next.js frontend with buyer/seller dashboards
- [x] IPFS invoice storage via Pinata
- [x] Integration test suite for trade escrow
- [ ] Prediction market test suite
- [ ] FedEx / UPS / Maersk carrier integrations
- [ ] Multisig admin for dispute resolution
- [ ] ZK Compression for trade account storage
- [ ] Mainnet deployment
- [ ] Mobile-optimized responsive UI

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <strong>⚡ AETHER-LOGOS</strong> — Trustless trade settlement for the real world.
  <br/>
  Built with 🦀 Rust, 🔷 Solana, and 🔐 zkTLS
</p>
