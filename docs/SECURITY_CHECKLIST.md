# AETHER-LOGOS Security Audit - Immediate Action Checklist

## 🔴 CRITICAL FINDINGS (Fix Before Hackathon Demo)

### Phase 1: Secrets & Dependencies (30-45 minutes)

- [ ] **Rotate Pinata JWT**
  - [ ] Go to https://app.pinata.cloud/api-keys
  - [ ] Revoke current JWT token (scoped key: `42319669bic3e070cfa7d`)
  - [ ] Generate new JWT token
  - [ ] Update `.env` file: `PINATA_JWT=<new-token>`
  - [ ] Update `agent/.env` file with new token
  - [ ] Verify no other `.env` files have old token

- [ ] **Verify Solana Keypair**
  - [ ] Check if `H7EJKdRvfFAQ45oQtr6T34GHo47ft4bLqdZToeps7HmX` is used elsewhere
  - [ ] Search codebase: `grep -r "H7EJKdRvfFAQ45oQtr6T34GHo47ft4bLqdZToeps7HmX" .`
  - [ ] If real devnet wallet: transfer balance to NEW keypair
  - [ ] Generate new keypair: `solana-keygen new --outfile ~/.config/solana/dev-id.json --force`
  - [ ] Update `.env`: `SOLANA_PRIVATE_KEY_BASE58=<new-keypair-base58>`

- [ ] **Private Key Removed from Documentation**
  - [ ] ✅ E2E_TEST_REPORT.md — Already fixed (private key redacted)
  - [ ] ✅ Git history — Already clean (no secrets committed)

### Phase 2: Dependency Vulnerabilities (45-60 minutes)

- [ ] **Fix bigint-buffer Buffer Overflow**
  ```bash
  cd app
  npm update @solana/spl-token@latest
  npm audit | grep bigint-buffer  # Should be gone
  ```

- [ ] **Replace Axios with Fetch (Pinata CVEs)**
  ```bash
  # File: app/src/app/api/upload/route.ts
  # Replace lines 60-64:
  # FROM:
  const pinataRes = await fetch(PINATA_URL, {
    method: "POST",
    headers,
    body: pinataForm,
  });
  # TO: (add explicit TLS verification)
  const pinataRes = await fetch(PINATA_URL, {
    method: "POST",
    headers,
    body: pinataForm,
    rejectUnauthorized: true,
    timeout: 30000,
  });
  ```

- [ ] **Verify Tests Still Pass**
  ```bash
  cd app
  npm run test:api
  # Expected: ✅ All 7 tests pass
  ```

### Phase 3: Authorization Fix (2-3 hours)

- [ ] **Add Wallet Signature Verification**
  
  Create `app/src/middleware.ts`:
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  
  export function middleware(request: NextRequest) {
    // Skip auth for public endpoints
    const publicPaths = ['/api/markets', '/api/marketplace/listings', '/api/marketplace/vendors'];
    if (publicPaths.some(p => request.nextUrl.pathname.startsWith(p))) {
      return NextResponse.next();
    }
    
    // For protected endpoints, verify wallet in request
    const walletHeader = request.headers.get('x-wallet-address');
    if (!walletHeader) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
    }
    
    return NextResponse.next();
  }
  
  export const config = {
    matcher: ['/api/users/:path*', '/api/vendors/:path*', '/api/stores/:path*', '/api/trades/:path*'],
  };
  ```

  Update routes to verify wallet signature in request body/headers

- [ ] **Test Authorization**
  - [ ] Call `/api/users/alice-wallet` without auth header → 401
  - [ ] Call `/api/users/alice-wallet` with correct wallet → 200
  - [ ] Call `/api/users/alice-wallet` with different wallet → 401

---

## 🟠 HIGH-SEVERITY (Fix This Sprint)

### Before Production Deployment

- [ ] **Update Elliptic-Dependent Packages**
  ```bash
  npm update @walletconnect@latest
  npm update @toruslabs@latest
  npm audit | grep elliptic  # Should show improvement
  ```

- [ ] **Review TLS Configuration**
  - [ ] All external API calls have `rejectUnauthorized: true`
  - [ ] All fetch calls have timeouts configured
  - [ ] Error handling for TLS failures

---

## 🟡 MEDIUM-SEVERITY (Before Production)

### API Rate Limiting

- [ ] **Install rate limiting package**
  ```bash
  cd app
  npm install express-rate-limit
  ```

- [ ] **Implement rate limiting middleware**
  - [ ] Limit: 10 requests/min per IP for /api/upload
  - [ ] Limit: 20 requests/min per wallet for /api/trades
  - [ ] Limit: 100 requests/min per IP for reads

### Security Logging

- [ ] **Add audit logging**
  ```typescript
  // app/src/utils/securityLog.ts
  export function logSecurityEvent(event: string, details: any) {
    console.warn(`[SECURITY] ${event}`, JSON.stringify(details));
    // TODO: Send to logging service (Datadog, Sentry, etc.)
  }
  ```

  Use in error paths:
  ```typescript
  logSecurityEvent('unauthorized_api_access', { 
    endpoint: '/api/users',
    wallet: walletInPath,
    attemptedWallet: walletFromAuth 
  });
  ```

---

## ✅ VERIFICATION CHECKLIST

After completing all fixes:

- [ ] **Build Succeeds**
  ```bash
  cd app && npm run build
  # Expected: Build succeeded (no errors)
  ```

- [ ] **Tests Pass**
  ```bash
  npm run test:api
  # Expected: ✅ All tests pass
  ```

- [ ] **No Security Warnings**
  ```bash
  npm audit
  # Expected: 0 CRITICAL, 0 HIGH vulnerabilities
  ```

- [ ] **Git Verification**
  ```bash
  git log --all --source --grep="private\|secret\|key" | head
  # Expected: (empty)
  ```

- [ ] **Local File Verification**
  ```bash
  grep -r "H7EJKdRvfFAQ45oQtr6T34GHo47ft4bLqdZToeps7HmX" .
  # Expected: (empty)
  ```

- [ ] **Manual Testing**
  - [ ] Can create new trade (requires valid wallet)
  - [ ] Can upload file (uses new Pinata JWT)
  - [ ] Can query markets (public endpoint works)
  - [ ] Cannot access other user's data (auth check works)

---

## 📞 SUPPORT

If stuck on any fix:
1. Check the relevant detailed audit report section
2. Refer to code comments in implementation examples
3. Run tests to verify each fix as you complete it
4. All fixes estimated at < 6 hours total

**Target Completion:** Before hackathon demo (leave buffer time for testing)

---

**Last Updated:** January 15, 2025  
**Status:** Ready for execution
