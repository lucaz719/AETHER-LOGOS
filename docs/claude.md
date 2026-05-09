# CLAUDE RUNBOOK (TOP-LEVEL OPERATOR GUIDE)

## 1) What you should do right now

Do **not fake business data** in production paths.  
Use 2 modes:

1. **API mode (no wallet/blockchain validation)** for frontend/backend API checks.
2. **Chain mode** for real on-chain transaction flow.

If your current goal is system reliability and demo flow, start with API mode, then move to chain mode.

---

## 2) Command map (Windows PowerShell)

### A. API mode only (no wallet / no blockchain validation)

```powershell
cd C:\Users\DELL\Desktop\AETHER-LOGOS\app
npm install
npm run test:api
npm run build
```

What this validates:
- `/api/markets`
- `/api/trades` request/response behavior
- `/api/upload` error path when credentials are missing

---

### B. Agent service only

```powershell
cd C:\Users\DELL\Desktop\AETHER-LOGOS\agent
go build ./...
go run .
```

Health check:

```powershell
Invoke-WebRequest http://localhost:8080/health
```

---

### C. Anchor build (program binaries + IDL)

```powershell
cd C:\Users\DELL\Desktop\AETHER-LOGOS
$env:PATH = "D:\.cargo\bin;" + $env:PATH
$env:CARGO_TARGET_DIR = "D:\aether-target"
$env:OPENSSL_DIR = "D:\vcpkg\installed\x64-windows-static"
$env:OPENSSL_STATIC = "1"
anchor build
```

After build, refresh IDL compatibility patch:

```powershell
node scripts/patch-idl.js
Copy-Item "C:\Users\DELL\Desktop\AETHER-LOGOS\target\idl\trade_escrow.json" "C:\Users\DELL\Desktop\AETHER-LOGOS\app\src\lib\idl\trade_escrow.json" -Force
Copy-Item "C:\Users\DELL\Desktop\AETHER-LOGOS\target\idl\prediction_market.json" "C:\Users\DELL\Desktop\AETHER-LOGOS\app\src\lib\idl\prediction_market.json" -Force
```

---

### D. Devnet tests (on-chain)

```powershell
cd C:\Users\DELL\Desktop\AETHER-LOGOS
$env:ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com"
$env:ANCHOR_WALLET = "C:\Users\DELL\.config\solana\id.json"
npx ts-mocha -p ./tsconfig.json -t 1000000 "tests/trade-escrow.ts"
npx ts-mocha -p ./tsconfig.json -t 1000000 "tests/prediction-market.ts"
```

---

## 3) Critical rule for real end-to-end chain flow

Program IDs must be consistent across:
- `programs/*/src/lib.rs` (`declare_id!`)
- `Anchor.toml` (`[programs.devnet]`)
- `target/deploy/*-keypair.json` pubkeys
- `target/idl/*.json` address
- `app/src/lib/anchor.ts` / env vars
- tests

If these drift, deployment and transactions fail with `DeclaredProgramIdMismatch`.

---

## 4) Recommended execution order

1. Run API mode checks (`npm run test:api`, `npm run build` in `app`).
2. Build programs (`anchor build`).
3. Patch/copy IDLs (`node scripts/patch-idl.js` + Copy-Item commands).
4. Confirm program ID consistency.
5. Run devnet tests.
6. Run frontend + agent together for integrated demo.
