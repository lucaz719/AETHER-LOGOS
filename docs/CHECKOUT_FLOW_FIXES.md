# Checkout Flow Fixes for Hackathon Demo (May 11)

## ✅ STEP 1: FULL CHECKOUT HAPPY PATH TRACE

### User Flow
```
/trades page → Click "COMMIT SETTLEMENT" button → Phantom signs → Success screen
```

### Call Chain (Happy Path)
```
USER ACTION: Click "COMMIT SETTLEMENT" button
  ↓
createTrade() [line 327, trades/page.tsx]
  ├─ For each item in effectiveItems:
  │   ├─ Calculate PDAs:
  │   │   ├─ tradeAccount PDA [buyer, trade_id]
  │   │   ├─ escrowVault PDA [trade_id]
  │   │   └─ vaultAuthority PDA ["authority"]
  │   ├─ Fetch buyer's USDC ATA
  │   ├─ Fetch seller's USDC ATA (data only, not used in tx)
  │   └─ Call escrowProgram.methods.createTrade()
  │       .accounts({buyer, seller, tradeAccount, escrowVault, vaultAuthority, buyerTokenAccount, usdcMint, systemProgram, tokenProgram})
  │       .rpc() ← Anchor implicitly calls Phantom.signTransaction() here
  │
  ├─ Await signature
  ├─ Store signature in sigs array
  ├─ Call fetchAgent() to Go agent /api/register (non-blocking on failure)
  │
  └─ On Success:
      ├─ Store signatures in successSignatures state
      ├─ setState("done")
      ├─ Render success screen with Explorer links
      └─ RefreshTrades() to reload active trades
```

### Transaction Structure
```
Instruction: createTrade
  - Accounts:
    • buyer (Signer, mut) — pays for PDA rent
    • seller (UncheckedAccount) — stored in trade account
    • tradeAccount (PDA, mut) — state storage
    • escrowVault (TokenAccount, mut) — USDC escrow
    • vaultAuthority (PDA) — signs future transfers
    • buyerTokenAccount (TokenAccount, mut) — USDC source
    • usdcMint (Mint) — DEVNET_USDC_MINT
    • systemProgram
    • tokenProgram
    • rent (Sysvar)

  - On-Chain Actions:
    1. Validate USDC mint matches DEVNET_USDC_MINT
    2. Calculate platform_fee = amount * 0.02 (200 bps)
    3. Transfer full amount to escrow vault
    4. Initialize TradeAccount with status=AwaitingShipment
    5. Emit TradeCreated event

  - Fee Handling:
    • Calculated at create_trade, stored in trade.platform_fee
    • NOT transferred to fee account yet (stays in vault)
    • Released during release_funds after proof verified
```

### Phantom Integration
- **Single Transaction per Seller**: If user orders from 5 vendors → 5 separate rpc() calls → 5 Phantom approvals
- **Buyer Signs Only**: Seller does not sign (one-sided commitment, intentional)
- **No Manual Signing**: Uses Anchor's `.rpc()` which handles Phantom.signTransaction() implicitly
- **Fee Payer**: Buyer pays for account rent + network fees (~0.0041 SOL per tx)

---

## ✅ STEP 2: BLOCKING ERRORS FIXED

### Error 1: Missing Seller Wallet in URL
**Location**: `createTrade()` line 364-366  
**Before**: `throw new Error("Missing seller wallet")` → crashes entire demo  
**After**: Check early, return with user-friendly error message  
**HACKATHON MOCK**: Added `console.warn()` to help debugging

### Error 2: Buyer ATA Not Created
**Location**: `createTrade()` line 388 → line 396 in new code  
**Before**: Program fails with "account not found" error, no user-facing message  
**After**: Check if buyer ATA exists before transaction; show "Your USDC account does not exist" if missing  
**Impact**: Prevents silent failures on checkout

### Error 3: Agent Registration Failure Crashes Flow
**Location**: `createTrade()` line 422-440 (now wrapped in try-catch)  
**Before**: If Go agent unavailable, whole transaction reverted  
**After**: Wrapped in try-catch; fails gracefully with warning log; on-chain transaction still succeeds  
**HACKATHON MOCK**: Agent registration is optional for demo flow

### Error 4: All Balance Errors Mapped to "Insufficient SOL"
**Location**: `resolveSettlementError()` function, `useCheckout.ts`  
**Before**: No differentiation between USDC shortage and SOL shortage  
**After**: See STEP 3 below

---

## ✅ STEP 3: ERROR MESSAGES FIXED

### Improved Error Handler
**File**: `app/src/hooks/useCheckout.ts` lines 13-31

```typescript
// Before: Generic "Insufficient Devnet SOL for fees"
// After: Contextual messages

if (USDC balance insufficient) {
  return "Insufficient USDC balance. You need $X.XX more. 
           Get devnet USDC → spl-token-faucet.com"
}

if (SOL balance < 0.005) {
  return "Insufficient SOL for transaction fees (~0.005 SOL). 
          Get devnet SOL → faucet.solana.com"
}
```

### New Balance Display on Checkout Page
**File**: `app/src/app/trades/page.tsx` lines 739-760

```
Available balance:  X.XXXXXX USDC  (fetched from user's ATA)
Gas balance:       X.XXXXXX SOL   (fetched from account balance)

[RED WARNING if USDC < grandTotal]
You need $X.XX more USDC. Get devnet USDC → spl-token-faucet.com

[YELLOW WARNING if SOL < 0.005]
Low on SOL. Get devnet SOL → faucet.solana.com
```

### Error Message in Error Box
**File**: `app/src/app/trades/page.tsx` lines 498-507

```
Shows error text + current balances in same alert:
"Error message here"
Available: X.XXXXXX USDC | X.XXXXXX SOL
```

---

## ✅ STEP 4: PLATFORM FEE ACCOUNT MOCK

### The Bug (On-Chain)
**File**: `programs/trade-escrow/src/lib.rs` line 589-592  
**Issue**: `ReleaseFunds` instruction has NO owner check on platform_fee_account
```rust
#[account(
    mut,
    constraint = platform_fee_account.mint == escrow_vault.mint,  // ✓ checks mint only
)]
pub platform_fee_account: Account<'info, TokenAccount>,
// ✗ MISSING: constraint = platform_fee_account.owner == TREASURY_AUTHORITY
```

**Impact**: Anyone could redirect platform fees to their own account during release_funds call

### Temporary Mock Solution (Frontend)
**File**: `app/src/lib/anchor.ts` lines 17-21

```typescript
// HACKATHON MOCK - Platform fee recipient wallet
// The on-chain ReleaseFunds instruction doesn't validate this account's owner (bug),
// so we hardcode a devnet wallet here for the demo. Replace with treasury PDA before mainnet.
export const PLATFORM_TREASURY_PUBKEY = new PublicKey(
  process.env.NEXT_PUBLIC_PLATFORM_TREASURY ?? "11111111111111111111111111111111"
);
```

**How to Use**:
1. Generate treasury wallet: `solana-keygen new` 
2. Fund it with devnet SOL
3. Set env var: `NEXT_PUBLIC_PLATFORM_TREASURY=<treasury_pubkey>`
4. During release_funds, ensure platform_fee_account is ATAssociated Token Account owned by treasury

**Before Mainnet**: 
- Add owner check to on-chain program
- Redeploy to mainnet
- Update frontend to use mainnet program ID

---

## ✅ STEP 5: SUCCESS STATE SCREEN

### New UI Component
**File**: `app/src/app/trades/page.tsx` lines 471-515

After successful rpc() call:

```jsx
Success Screen Shows:
├─ ✓ Trade Committed Successfully! (green header)
├─ "Funds are now locked in escrow. The vendor will ship on delivery..."
├─ For each transaction signature:
│   ├─ Transaction 1
│   ├─ Signature: [0x...truncated...]
│   └─ [View Explorer ↗] link to Solana devnet explorer
├─ Action buttons:
│   ├─ "Place Another Trade" → clears successSignatures, back to form
│   └─ "View Active Trades" → link to /trades to see open orders
```

### What Changed
- **Before**: After .rpc() resolves, no success feedback, UI shows nothing
- **After**: Immediately shows green success banner with signatures and action buttons
- **Explorer Link**: Clickable link to `https://explorer.solana.com/tx/{signature}?cluster=devnet`

---

## ✅ STEP 6: SMOKE TEST CHECKLIST

Run this manual test before May 11 demo:

### Pre-Test Setup
- [ ] Phantom wallet connected to Devnet
- [ ] Wallet has ~1 SOL (for fees)
- [ ] Wallet has test USDC (get from spl-token-faucet.com)
- [ ] No error console logs blocking flow
- [ ] `npm run build` passes (may have pre-existing TS errors, OK)

### Test Case 1: Happy Path Single Vendor
- [ ] Navigate to `/trades?productId=mock-1&title=Test&sellerWallet=<seller_pubkey>&priceUsdc=10&quantity=2`
- [ ] See "Commit Settlement" button enabled
- [ ] Verify "Available balance" shows wallet's USDC balance
- [ ] Verify "Gas balance" shows wallet's SOL balance
- [ ] Click "COMMIT SETTLEMENT"
- [ ] Phantom opens with correct transaction
- [ ] Sign transaction
- [ ] Progress steps animate (hashing PO → invoice → locking USDC → registering)
- [ ] Success screen appears with green banner ✓
- [ ] Transaction signature shown and clickable to Explorer
- [ ] Can click "Place Another Trade" to reset form
- [ ] Can click "View Active Trades" to navigate back

### Test Case 2: Insufficient USDC
- [ ] Start with 0 USDC in wallet (don't mint any)
- [ ] Navigate to trade page
- [ ] See "Available balance: 0.000000 USDC" in red
- [ ] See warning: "You need $X.XX more USDC"
- [ ] "COMMIT SETTLEMENT" button disabled (grayed out)
- [ ] Click "COMMIT SETTLEMENT" → nothing happens
- [ ] Get USDC from faucet
- [ ] Balance updates in real-time (within 10 seconds)
- [ ] Button enables again

### Test Case 3: Insufficient SOL
- [ ] Transfer all SOL out of wallet (keep small amount)
- [ ] Verify "Gas balance: 0.000000 SOL" in yellow
- [ ] If balance < 0.005, show "Low on SOL" warning
- [ ] Can still try to commit if USDC sufficient
- [ ] Transaction fails with: "Insufficient SOL for transaction fees (~0.005 SOL). Get devnet SOL → faucet.solana.com"
- [ ] Get SOL from faucet
- [ ] Error message clears
- [ ] Can try again successfully

### Test Case 4: Missing Seller Wallet
- [ ] Navigate to `/trades?productId=mock-1&title=Test&priceUsdc=10&quantity=2` (no sellerWallet)
- [ ] Click "COMMIT SETTLEMENT"
- [ ] Show error: "Seller wallet not specified. Check your trade URL."
- [ ] Button disabled until valid URL

### Test Case 5: Agent Unavailable (Non-Blocking)
- [ ] Stop Go agent service (`pkill -f 'go run'` or equivalent)
- [ ] Try to commit a valid trade
- [ ] On-chain transaction succeeds ✓ (shows success screen)
- [ ] Agent registration fails silently (console has warning log)
- [ ] User doesn't see agent error
- [ ] Restart agent: should work for next trade

### Test Case 6: Active Trades Display
- [ ] After successful trade, scroll down on `/trades`
- [ ] See "Active trades" section with existing trades
- [ ] Each trade shows "Settlement account active" + "Monitoring delivery"
- [ ] Count matches number of successful commits

### Expected Outcome
✅ All 6 test cases pass → **Ready for hackathon demo!**

---

## 🚀 DEPLOYMENT NOTES

### Vercel (Next.js Frontend)
```bash
# Set these environment variables:
NEXT_PUBLIC_ESCROW_PROGRAM_ID=Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS
NEXT_PUBLIC_MARKET_PROGRAM_ID=HmbTLCmaGtYhSJafyMNx2YdAfJvpGAE2x5JRf8kzGiuY
NEXT_PUBLIC_AGENT_URL=https://<render-agent-url>
NEXT_PUBLIC_PLATFORM_TREASURY=<devnet_treasury_pubkey> (optional for demo)
```

### Render (Go Agent)
```bash
# Nothing new needed - agent already configured
```

### For Production (Before Mainnet)
1. **Fix platform fee account owner constraint** in `programs/trade-escrow/src/lib.rs`
2. **Redeploy program** to mainnet
3. **Update NEXT_PUBLIC_ESCROW_PROGRAM_ID** to mainnet program ID
4. **Remove HACKATHON MOCK comments** once real deployment in place

---

## 📝 HACKATHON MOCK SUMMARY

Total mocks/workarounds:
- ✓ Platform treasury wallet hardcoded (needs on-chain fix before mainnet)
- ✓ Error messages differentiate USDC vs SOL (best practice)
- ✓ Agent registration wrapped in try-catch (non-blocking)
- ✓ ATA pre-check before transaction (safety improvement)
- ✓ SOL balance display (UX improvement)
- ✓ Success screen with signatures (UX enhancement)

None of these mocks break the on-chain logic. All are frontend improvements or graceful degradation.
