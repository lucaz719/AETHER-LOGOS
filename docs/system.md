# SYSTEM.MD — AETHER-LOGOS TOP-LEVEL SYSTEM PLAN

## 1) Logical architecture

### Core layers
1. **Trade Escrow Program (Anchor/Rust)**  
   Owns trade lifecycle and escrow vault settlement.
2. **Prediction Market Program (Anchor/Rust)**  
   Hedge market for shipment outcomes.
3. **Marketplace Program (Anchor/Rust)** *(new)*  
   Vendor registry, product listings, order metadata, and CPI bridge to trade-escrow.
4. **Agent (Go)**  
   Polls carrier data, stores milestones, submits proof flow. Also watches `MarketplaceOrder` accounts.
5. **App (Next.js)**  
   Buyer/seller dashboards + API routes + wallet-integrated UI.

---

## 1a) Marketplace Layer

The marketplace sits **on top of** the `trade-escrow` program. It handles discovery and checkout; all money flows through the escrow vault.

### Architecture
```
Marketplace Layer
  ├── programs/marketplace/         ← Anchor program (vendor, listings, orders)
  ├── app/src/app/marketplace/      ← Next.js marketplace UI
  ├── app/src/app/api/marketplace/  ← read-only API decoders
  ├── app/src/app/vendor/           ← vendor dashboard pages
  ├── app/src/hooks/use{Cart,Checkout,VendorProfile,Listings,MarketplaceOrders,VendorReviews}.ts
  ├── app/src/components/{VendorCard,ProductCard,CategoryNav,CartDrawer,CheckoutFlow,...}.tsx
  └── agent/marketplace_order_watcher.go
```

### Purchase Flow
1. Buyer browses → adds to cart → places order
2. Marketplace program creates `MarketplaceOrder` PDA
3. CPI calls `trade_escrow::create_trade` → USDC locked in escrow vault
4. Seller fulfills, submits tracking (same as existing escrow flow)
5. Delivery proof → `release_funds`

### Program IDs
- `marketplace`: `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnN` (devnet/localnet)

### New Env vars
- `NEXT_PUBLIC_MARKETPLACE_PROGRAM_ID`
- `MARKETPLACE_PROGRAM_ID` (agent)

---

## 2) Dependency linkage (how components depend on each other)

### On-chain and client bindings
- `programs/*` produce `target/idl/*.json` and `target/deploy/*.so`.
- App and tests consume IDLs from:
  - `target/idl/*.json` (tests)
  - `app/src/lib/idl/*.json` (frontend)
- `scripts/patch-idl.js` bridges IDL compatibility for JS Anchor client parsing.

### Runtime wiring
- App API `/api/trades` uses Solana RPC + escrow IDL decoder.
- App API `/api/upload` depends on Pinata credentials.
- Agent depends on:
  - Solana RPC
  - wallet/keypair
  - optional Reclaim + carrier keys

---

## 3) Actual system flow

1. Buyer creates trade (escrow funded).
2. Seller submits tracking.
3. Agent monitors shipment state.
4. Delivery proof path (zkTLS/fallback proof data).
5. Proof submitted on-chain.
6. Funds released to seller.
7. Optional prediction market hedge lifecycle:
   - create market
   - place yes/no hedge
   - resolve
   - winners claim

---

## 4) Test strategy (top-level)

### Level A — API framework tests (no blockchain validation)
- Run in `app`:
  - `npm run test:api`
  - `npm run build`
- Verifies API contract and app integration surface.

### Level B — On-chain integration tests
- Run in repo root:
  - `npx ts-mocha ... tests/trade-escrow.ts`
  - `npx ts-mocha ... tests/prediction-market.ts`
- Requires working deploy and consistent program IDs.

### Level C — Agent runtime checks
- Run in `agent`:
  - `go build ./...`
  - `go run .`
  - `/health`, `/poll` endpoint checks

---

## 5) Required env/config surfaces

### Root
- Solana RPC and wallet paths
- Reclaim and carrier API keys (optional for fallback mode)

### App
- `NEXT_PUBLIC_SOLANA_RPC_URL`
- `NEXT_PUBLIC_ESCROW_PROGRAM_ID`
- `NEXT_PUBLIC_MARKET_PROGRAM_ID`
- `NEXT_PUBLIC_MARKETPLACE_PROGRAM_ID`
- `PINATA_API_KEY`, `PINATA_SECRET_KEY` (for upload route success path)

### Agent
- RPC URL
- wallet / keypair path
- DB path / port
- carrier keys
- `MARKETPLACE_PROGRAM_ID` (optional; enables marketplace order watcher)

---

## 6) Command runbook (single place)

```powershell
# repo root
cd C:\Users\DELL\Desktop\AETHER-LOGOS

# Anchor build env
$env:PATH = "D:\.cargo\bin;" + $env:PATH
$env:CARGO_TARGET_DIR = "D:\aether-target"
$env:OPENSSL_DIR = "D:\vcpkg\installed\x64-windows-static"
$env:OPENSSL_STATIC = "1"

# 1) build programs
anchor build

# 2) patch IDLs and sync app copies
node scripts/patch-idl.js
Copy-Item "C:\Users\DELL\Desktop\AETHER-LOGOS\target\idl\trade_escrow.json" "C:\Users\DELL\Desktop\AETHER-LOGOS\app\src\lib\idl\trade_escrow.json" -Force
Copy-Item "C:\Users\DELL\Desktop\AETHER-LOGOS\target\idl\prediction_market.json" "C:\Users\DELL\Desktop\AETHER-LOGOS\app\src\lib\idl\prediction_market.json" -Force
Copy-Item "C:\Users\DELL\Desktop\AETHER-LOGOS\target\idl\marketplace.json" "C:\Users\DELL\Desktop\AETHER-LOGOS\app\src\lib\idl\marketplace.json" -Force

# 3) app API mode tests
cd app
npm install
npm run test:api
npm run build

# 4) agent build
cd ..\agent
go build ./...

# 5) chain tests (from repo root)
cd ..
$env:ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com"
$env:ANCHOR_WALLET = "C:\Users\DELL\.config\solana\id.json"
npx ts-mocha -p ./tsconfig.json -t 1000000 "tests/trade-escrow.ts"
npx ts-mocha -p ./tsconfig.json -t 1000000 "tests/prediction-market.ts"
npx ts-mocha -p ./tsconfig.json -t 1000000 "tests/marketplace.ts"
```

---

## 7) Main operational risk to control

**Program ID drift** across code, IDLs, deploy keypairs, app env, and tests.  
Keep these values aligned before deploy/testing, otherwise full transaction flow cannot complete.
