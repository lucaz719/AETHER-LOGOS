<p align="center">
  <a href="https://solana.com">
    <img src="https://img.shields.io/badge/SOLANA-DEVNET-9945FF?style=for-the-badge&logo=solana&logoColor=white" alt="Solana" />
  </a>
  <a href="https://www.anchor-lang.com">
    <img src="https://img.shields.io/badge/ANCHOR-0.32-2563EB?style=for-the-badge" alt="Anchor 0.32" />
  </a>
  <img src="https://img.shields.io/badge/MARKETPLACE-ON--CHAIN-06B6D4?style=for-the-badge" alt="On-chain marketplace" />
  <img src="https://img.shields.io/badge/HEDGE-MARKETS-F59E0B?style=for-the-badge" alt="Hedge markets" />
  <img src="https://img.shields.io/badge/AGENT-GO%20SERVICE-10B981?style=for-the-badge" alt="Go agent" />
</p>

<h1 align="center">AETHER-LOGOS</h1>

<p align="center"><strong>Asset-Light Trade Settlement Protocol on Solana</strong></p>

<p align="center">
  Escrow-backed B2B settlement | Marketplace ordering | Logistics hedge markets | Agentic proof submission
</p>

<p align="center">
  Built for the Solana Frontier Hackathon 2026
</p>

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Core Modules](#core-modules)
- [On-Chain Programs](#on-chain-programs)
- [End-to-End Flows](#end-to-end-flows)
- [Frontend Surfaces](#frontend-surfaces)
- [Agent Service](#agent-service)
- [Repository Layout](#repository-layout)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Current Implementation Notes](#current-implementation-notes)
- [Deployment Notes](#deployment-notes)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Cross-border B2B trade still depends on delayed verification, paper workflows, and manual trust handoffs. AETHER-LOGOS replaces those weak points with:

- programmable USDC escrow
- cryptographic delivery verification (zkTLS path + fallback path)
- marketplace-native order metadata tied to escrow
- optional shipment-risk hedging via prediction markets

The design goal is practical adoption: keep existing logistics rails, then make settlement and risk transfer programmable.

---

## Architecture

```text
+-------------------------+       +-------------------------+
|  Next.js App            | <---> |  Solana Programs        |
|  (buyer/seller UI)      |       |  (Anchor)               |
+------------+------------+       +------+------------------+
             |                           |
             | REST + polling            | on-chain state
             v                           v
+-------------------------+       +-------------------------+
|  Go Agent               | ----> | Trade Escrow Program    |
|  (carrier + proof flow) |       | (fund lock/release)     |
+------------+------------+       +-------------------------+
             |
             | carrier data + proof generation
             v
+-------------------------+
| DHL API / Reclaim zkTLS |
+-------------------------+

Marketplace Program CPI-calls Trade Escrow create_trade.
Prediction Market Program runs hedge staking and payouts.
```

---

## Core Modules

| Module | Path | Purpose |
|---|---|---|
| Trade Escrow Program | `programs/trade-escrow` | Escrow lifecycle, dispute flow, release logic, platform fee logic |
| Prediction Market Program | `programs/prediction-market` | Yes/No hedge markets with parimutuel payouts |
| Marketplace Program | `programs/marketplace` | Vendor profiles, listings, orders, reviews, escrow CPI bridge |
| Agent Service (Go) | `agent` | Shipment polling, milestone storage, proof generation/submission |
| Frontend App (Next.js) | `app` | Buyer/seller journeys, marketplace UX, checkout, dashboards |

---

## On-Chain Programs

### Trade Escrow (`trade_escrow`)

Program ID (Anchor.toml): `6pZzkjVSVwnhEGoqSZ5kUFzaNvmY2Dhoju5eEpbBo9T3`

Key instructions:

| Instruction | Purpose |
|---|---|
| `create_trade` | Lock buyer USDC in escrow vault PDA |
| `submit_tracking` | Seller submits tracking carrier + ID |
| `submit_proof` | Attach proof bytes and move to verified |
| `release_funds` | Transfer escrow to seller + platform fee account |
| `cancel_trade` | Buyer cancellation after ship deadline |
| `open_dispute` | Buyer/seller dispute transition |
| `admin_resolve` | Admin resolves disputed trade |
| `init_config` | Initialize config PDA |
| `withdraw_platform_fees` | Admin withdrawal from fee vault |

Primary PDA seeds:

- Trade account: `["trade", buyer, trade_id]`
- Escrow vault: `["vault", trade_id]`
- Vault authority: `["authority"]`

### Prediction Market (`prediction_market`)

Program ID (Anchor.toml): `Aopbcs5WyUGqhezfAofgaFEETbFi3eeh97gqahG3darr`

Key instructions:

| Instruction | Purpose |
|---|---|
| `create_market` | Create hedge market for shipment twin |
| `place_hedge` | Stake USDC on Yes or No |
| `resolve_market` | Creator resolves market after resolution time |
| `claim_winnings` | Winners claim proportional pool payout |

Payout model:

```text
user_payout = (user_stake * total_pool) / winning_side_total
```

Primary PDA seeds:

- Market account: `["market", shipment_twin]`
- Position: `["position", market_pubkey, user_pubkey]`
- Market vault: `["market_vault", market_pubkey]`
- Market authority: `["market_authority", market_pubkey]`

### Marketplace (`marketplace`)

Program IDs:

- localnet: `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnN`
- devnet: `6qjk2gfJTHhqYmTwUM4WnoKYpjrzeneqKdR5NH3jXdTj`

Key instructions:

| Instruction | Purpose |
|---|---|
| `init_config` | Initialize marketplace admin config |
| `register_vendor` | Create vendor profile |
| `update_vendor` | Update vendor fields |
| `verify_vendor` | Admin verification toggle |
| `create_listing` | Create product listing |
| `update_listing` | Update listing |
| `deactivate_listing` | Soft deactivate listing |
| `place_order` | Create marketplace order and CPI-call escrow `create_trade` |
| `cancel_order` | Cancel marketplace order when escrow trade is cancelled |
| `submit_review` | Post-delivery review linked to trade |
| `close_review` | Admin closes abusive review |

Primary PDA seeds:

- Config: `["config"]`
- Vendor profile: `["vendor", authority]`
- Listing: `["listing", vendor_authority, listing_id]`
- Marketplace order: `["mktorder", buyer, order_id]`
- Review: `["review", trade_account, reviewer]`

---

## End-to-End Flows

### Marketplace order -> escrow settlement

```text
Buyer wallet
   |
   | place_order (Marketplace)
   v
Marketplace Program
   |
   | CPI -> trade_escrow::create_trade
   v
Trade Escrow Program (USDC locked in vault PDA)
   |
   | seller submits tracking
   v
Go Agent polls carrier + builds proof
   |
   | submit_proof
   v
Trade status -> Verified
   |
   | release_funds
   v
Seller payout + platform fee split
```

### Hedge lifecycle

```text
Market creator -> create_market
Users stake -> place_hedge (Yes/No)
Resolution time reached
Creator -> resolve_market
Winning users -> claim_winnings
```

---

## Frontend Surfaces

### Major routes

| Route | Purpose |
|---|---|
| `/` | Landing page and protocol intro |
| `/onboarding` | Buyer/seller onboarding flow |
| `/stores` | Supplier discovery portal |
| `/dashboard` | Procurement + hedge mode switch |
| `/trades` | Settlement-oriented trade commit flow |
| `/marketplace/search` | Listing search and filters |
| `/marketplace/listing/[pubkey]` | Listing detail |
| `/marketplace/vendor/[pubkey]` | Vendor profile + catalog |
| `/marketplace/cart` | Cart state |
| `/marketplace/checkout` | Checkout flow |
| `/marketplace/orders` | Buyer orders |
| `/vendor/...` | Vendor registration, listings, orders, store management |

Note: `/marketplace` currently redirects to `/dashboard`.

### App API routes

| Route | Purpose |
|---|---|
| `GET /api/trades` | Decode and list escrow trades |
| `GET /api/markets` | Placeholder response (`markets: []`) |
| `POST /api/upload` | Pinata upload (JWT/key auth) with mock CID fallback |
| `GET /api/marketplace/vendors` | Vendor profile scan with filtering |
| `GET /api/marketplace/listings` | Listing scan with filters/sort/pagination |
| `GET /api/marketplace/orders` | Buyer/vendor order query |
| `GET /api/marketplace/reviews/[vendor]` | Vendor review list |

---

## Agent Service

The agent runs independently and bridges logistics events to on-chain settlement.

### Agent API endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/register` | Register shipment/trade context |
| GET | `/poll` | Trigger poll cycle manually |
| POST | `/notify` | Webhook notification endpoint |
| GET | `/health` | Health check |
| GET | `/api/tracking/:id` | Shipment + milestone detail |
| GET | `/api/tracking/trade/:trade` | Tracking by trade account |
| GET | `/marketplace/orders` | Decoded on-chain marketplace orders |
| GET/POST | `/api/vendor/*`, `/api/products*`, `/api/stores*` | Auxiliary vendor/store/product APIs |

### Agent behavior summary

1. polls registered shipments
2. fetches carrier status/milestones
3. stores milestones in SQLite
4. detects status transitions and sends notifications
5. on delivered state:
   - use Reclaim zkTLS when configured
   - fallback to SHA256 proof path when not configured
   - submit proof on-chain when signer/program env is configured

---

## Repository Layout

```text
AETHER-LOGOS/
|-- programs/
|   |-- trade-escrow/
|   |-- prediction-market/
|   `-- marketplace/
|-- app/                     # Next.js frontend
|-- agent/                   # Go service + SQLite
|-- tests/                   # Anchor integration tests
|-- scripts/patch-idl.js     # IDL patch helper
|-- Anchor.toml
|-- Cargo.toml
`-- README.md
```

---

## Getting Started

### Prerequisites

- Rust toolchain
- Solana CLI
- Anchor CLI `0.32.x`
- Node.js `18+`
- Go `1.22+`

### Install dependencies

```bash
# repo root
npm install

# app
cd app
npm install
cd ..
```

### Build programs and patch IDLs

```bash
anchor build
node scripts/patch-idl.js
```

If you rebuilt IDLs, sync app IDLs from `target/idl` to `app/src/lib/idl`.

Unix example:

```bash
cp target/idl/trade_escrow.json app/src/lib/idl/trade_escrow.json
cp target/idl/prediction_market.json app/src/lib/idl/prediction_market.json
cp target/idl/marketplace.json app/src/lib/idl/marketplace.json
```

PowerShell example:

```powershell
Copy-Item target\idl\trade_escrow.json app\src\lib\idl\trade_escrow.json -Force
Copy-Item target\idl\prediction_market.json app\src\lib\idl\prediction_market.json -Force
Copy-Item target\idl\marketplace.json app\src\lib\idl\marketplace.json -Force
```

### Configure environment files

```bash
cp .env.example .env
cp app/.env.local.example app/.env.local
cp agent/.env.example agent/.env
```

### Run services

```bash
# terminal 1
cd app
npm run dev

# terminal 2
cd agent
go run .
```

---

## Environment Variables

| Scope | Variable | Notes |
|---|---|---|
| Root | `SOLANA_RPC_URL`, `ANCHOR_PROVIDER_URL`, `ANCHOR_WALLET` | Anchor and RPC config |
| Root | `RECLAIM_APP_ID`, `RECLAIM_APP_SECRET`, `MOCK_PROOF` | Proof mode control |
| Root/App | `NEXT_PUBLIC_SOLANA_RPC_URL` | Frontend RPC endpoint |
| App | `NEXT_PUBLIC_TRADE_ESCROW_PROGRAM_ID` or `NEXT_PUBLIC_ESCROW_PROGRAM_ID` | Escrow program ID |
| App | `NEXT_PUBLIC_PREDICTION_MARKET_PROGRAM_ID` or `NEXT_PUBLIC_MARKET_PROGRAM_ID` | Prediction market program ID |
| App | `NEXT_PUBLIC_MARKETPLACE_PROGRAM_ID` | Marketplace program ID |
| App | `PINATA_JWT` (preferred) or `PINATA_API_KEY` + `PINATA_SECRET_KEY` | Upload API auth |
| Agent | `SOLANA_RPC`, `TRADE_ESCROW_PROGRAM_ID`, `SOLANA_PRIVATE_KEY_BASE58` | On-chain proof submission |
| Agent | `MARKETPLACE_PROGRAM_ID`, `DHL_API_KEY`, `PORT`, `DATABASE_PATH`/`AGENT_DB_PATH` | Agent runtime |

---

## Testing

```bash
# root anchor/mocha tests
npm test

# app API route smoke tests
cd app
npm run test:api

# app production build
npm run build

# agent compile check
cd ../agent
go build ./...
```

---

## Current Implementation Notes

This repository includes hackathon shortcuts. Important ones:

1. `trade-escrow::release_funds` currently has relaxed checks for demo flow (`HACKATHON MOCK` comments in code).
2. Hedge UX in dashboard uses simulated execution and local storage positions; `/api/markets` is currently a placeholder.
3. Agent polling loop actively processes DHL in `runPollCycle`; other carriers are scaffolded but not in full parity.
4. Agent marketplace watcher currently focuses on decoded order visibility and coordination with shipment tracking.

These are visible, intentional implementation realities and should be addressed before mainnet production hardening.

---

## Deployment Notes

- Frontend is Vercel-ready (`vercel.json`).
- Agent is Render-ready (`render.yaml`).
- Keep program IDs aligned across:
  - `Anchor.toml`
  - deployed keypairs
  - app env vars
  - agent env vars
  - IDLs

Program ID drift is the most common integration failure point.

---

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Make focused changes with clear commits.
4. Run relevant tests/build checks.
5. Open a pull request with scope and rationale.

---

## License

MIT. See [LICENSE](LICENSE).

