# ⚡ AETHER-LOGOS

**Asset-Light Trade Settlement Protocol on Solana**

> Built for the Solana Frontier Hackathon 2026. Eliminates the $2.5T global trade finance gap using zkTLS proofs and atomic escrow settlement.

## Overview

Aether-Logos converts existing global logistics data (DHL, Maersk, FedEx) into on-chain cryptographic **Proofs of Custody** using zkTLS via Reclaim Protocol. These proofs drive atomic escrow releases and power a decentralized prediction market for trade risk hedging.

**No new hardware. No new data.** Uses the logistics rail that already covers 220+ countries.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AETHER-LOGOS Protocol                     │
├─────────────┬──────────────┬───────────────┬────────────────┤
│  Layer A    │   Layer B    │   Layer C     │   Layer D      │
│  Escrow     │   zkTLS      │   Prediction  │   Agent        │
│  Program    │   Verifier   │   Market      │   Backend      │
│  (Anchor)   │   (Reclaim)  │   (Anchor)    │   (Golang)     │
├─────────────┴──────────────┴───────────────┴────────────────┤
│                      Solana Blockchain                       │
│              Token-2022  ·  ZK Compression                   │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 🦀 Trade Escrow Program (`programs/trade-escrow/`)
Anchor program managing USDC escrow with milestone-based release.

- `create_trade` — Buyer deposits USDC into PDA vault
- `submit_proof` — zkTLS proof verification (CPI to Reclaim verifier)
- `release_funds` — Permissionless release after verification
- `open_dispute` — Buyer/seller dispute mechanism
- `admin_resolve` — Multisig-gated dispute resolution

### 📈 Prediction Market (`programs/prediction-market/`)
Parimutuel AMM for trade risk hedging ("Polymarket for trade risk").

- `create_market` — Open hedge market for a shipment
- `place_hedge` — Stake USDC on Yes/No outcome
- `resolve_market` — Resolve via zkTLS proof data
- `claim_winnings` — Proportional payout from pot

### 🔐 zkTLS Verification (Reclaim Protocol)
Software-only oracle using zkTLS to prove carrier delivery status without leaking credentials.

### 🤖 Agentic Backend (`agent/`)
Go service that polls carrier APIs and triggers proof generation automatically.

- `POST /register` — Register shipment for monitoring
- `GET /poll` — Cron: check carrier status changes
- `POST /notify` — Webhook to merchant on status change
- `GET /health` — Health check

### 🖥️ Frontend (`app/`)
Next.js 15 dashboard with Solana wallet integration.

## Quick Start

### Prerequisites
- Rust 1.75+ & Anchor CLI 0.32+
- Solana CLI 1.18+
- Node.js 18+ & npm
- Go 1.22+

### Setup

```bash
# Clone the repository
git clone https://github.com/lucaz719/AETHER-LOGOS.git
cd AETHER-LOGOS

# Build Solana programs
anchor build

# Run tests
anchor test

# Start the frontend
cd app && npm install && npm run dev

# Start the agent
cd agent && go run .
```

### Environment

Copy `.env.example` to `.env` and fill in your keys:
```bash
cp .env.example .env
```

## User Flow

```
1. Seller creates trade intent (item, price, carrier)
2. Buyer deposits USDC into escrow PDA
3. Seller ships via DHL/FedEx, enters tracking ID
4. Agent monitors carrier API for status changes
5. On delivery: merchant generates zkTLS proof
6. Proof verified on-chain via Reclaim CPI
7. Escrow automatically released to seller
8. Optional: hedge market resolved, winners claim payout
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Smart Contracts | Rust + Anchor 0.32 |
| Blockchain | Solana (devnet → mainnet) |
| Token Standard | SPL Token + Token-2022 |
| Compression | ZK Compression (Light Protocol) |
| Oracle | zkTLS (Reclaim Protocol) |
| Frontend | Next.js 15 + React 19 |
| Agent | Go 1.22 + SQLite |
| Wallet | Phantom (via wallet-adapter) |

## Project Structure

```
AETHER-LOGOS/
├── programs/
│   ├── trade-escrow/        # Core escrow Anchor program
│   │   └── src/lib.rs
│   └── prediction-market/   # Hedge market Anchor program
│       └── src/lib.rs
├── app/                     # Next.js 15 frontend
│   └── src/app/
├── agent/                   # Go shipping monitor agent
│   ├── main.go
│   ├── handlers.go
│   ├── carrier.go
│   └── db.go
├── tests/                   # Anchor integration tests
├── migrations/              # Deployment scripts
├── Anchor.toml
├── Cargo.toml
└── .env.example
```

## License

MIT
