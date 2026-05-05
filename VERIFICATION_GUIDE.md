# VERIFICATION GUIDE: Step-by-Step Testing

**Date:** 2026-05-04  
**Status:** Ready for QA  
**Estimated Time:** 15-20 minutes

---

## PRE-TEST SETUP

### 1. Clear localStorage (Start Fresh)
```javascript
// In DevTools Console:
localStorage.clear();
location.reload();
```

### 2. Start the Dev Server
```bash
cd app/
npm run dev
```
App should be running at: http://localhost:3000

### 3. Have a Wallet Ready
- Use Phantom, Solflare, or similar on devnet
- Ensure wallet is ready to connect
- Do NOT connect yet

---

## TEST SUITE

### **TEST 1: Fresh Buyer Onboarding**

**Objective:** Verify buyer role persists through page refresh

**Steps:**
1. Go to http://localhost:3000/
2. Click "Launch App" button (any of the CTAs)
3. Redirects to /onboarding
4. Should see: "How will you use AETHER-LOGOS?" with two buttons
5. Click "I want to Buy"
6. Should see: "Secure Escrow Explained" (Step 1 of 2)

**Verification:**
```javascript
// In Console:
JSON.parse(localStorage.getItem('aether_onboarding'));
// Should return:
// {
//   "state": {
//     "userRole": "buyer",
//     "sellerTier": null,
//     "onboardingCompleted": false,
//     "currentStep": 1
//   },
//   "version": 1
// }
```

**Continue:**
7. Click "Continue"
8. Should see: "Ready to Browse" (Step 2 of 2)
9. **Refresh page** (F5 or Ctrl+R)

**Expected Behavior:** ✅ Should still show "Ready to Browse", NOT role selection
- Store data should be identical to above

**Pass Criteria:**
- ✅ Role selection does NOT appear after refresh
- ✅ localStorage shows `userRole: "buyer"`
- ✅ currentStep remains 2

---

### **TEST 2: Fresh Seller Onboarding with Tier**

**Objective:** Verify seller tier persists through page refresh

**Steps:**
1. localStorage.clear() and reload
2. Go to /onboarding
3. Click "I want to Sell"
4. Should see: "Choose Your Seller Tier"
5. Click "Verified Wholesaler"

**Verification:**
```javascript
JSON.parse(localStorage.getItem('aether_onboarding'));
// Should show:
// {
//   "state": {
//     "userRole": "seller",
//     "sellerTier": "wholesaler",
//     "onboardingCompleted": false,
//     "currentStep": 2
//   },
//   ...
// }
```

6. Should advance to Step 2: "Complete Your Profile"
7. **Refresh page** (F5)

**Expected Behavior:** ✅ Should remain on "Complete Your Profile", NOT tier selection
- Should show the tier-specific fields (Bulk Capacity input for wholesaler)

**Pass Criteria:**
- ✅ Tier selection screen does NOT reappear
- ✅ Form fields for "Wholesaler" tier are visible
- ✅ currentStep shows 2

---

### **TEST 3: Vendor Registration Form Draft**

**Objective:** Verify registration form persists on page refresh

**Setup:**
1. localStorage.clear() and reload
2. Go to http://localhost:3000/vendor/register
3. Click "Connect Wallet" (if not already connected)

**Steps:**
1. Fill in form fields:
   - Shop Name: "Aurora Tech Supplies"
   - Shop Description: "We provide cutting-edge technology solutions"
   - Vendor Type: "Manufacturer"
   - Categories: Click "Electronics", "Machinery", "Automotive"
   - Email: "owner@aurora-tech.com"

**Verification (Before Refresh):**
```javascript
JSON.parse(localStorage.getItem('aether_registration_draft'));
// Should show all fields populated
```

2. **Refresh page** (F5)

**Expected Behavior:** ✅ All form fields populated with exact values entered

**Pass Criteria:**
- ✅ Shop Name field shows "Aurora Tech Supplies"
- ✅ Description field shows full text
- ✅ Vendor Type shows "Manufacturer"
- ✅ All 3 selected categories are checked
- ✅ Email field shows "owner@aurora-tech.com"

---

### **TEST 4: Complete Buyer Onboarding to Dashboard**

**Objective:** Verify buyer onboarding completion flag and redirect

**Steps:**
1. localStorage.clear() and reload
2. Go to /onboarding
3. Select "I want to Buy"
4. Click "Continue"
5. Click "Browse Marketplace →"

**Expected Behavior:** ✅ Redirects to /dashboard

**Verification:**
```javascript
JSON.parse(localStorage.getItem('aether_onboarding'));
// Should show:
// {
//   "state": {
//     ...
//     "onboardingCompleted": true
//     ...
//   }
// }
```

**Pass Criteria:**
- ✅ Page redirects to /dashboard or /marketplace
- ✅ onboardingCompleted flag is true
- ✅ userRole is "buyer"

---

### **TEST 5: Complete Seller Onboarding to Dashboard**

**Objective:** Verify seller onboarding completion and store creation

**Steps:**
1. localStorage.clear() and reload
2. Go to /onboarding
3. Select "I want to Sell"
4. Select "Certified Distributor" tier
5. Fill Shop Name: "Global Distributors Ltd"
6. Fill Categories: "Electronics, Tools"
7. Click "Continue"
8. Fill Distribution Region: "Asia-Pacific"
9. Click "Complete Setup"

**Expected Behavior:**
- ✅ API call to POST /api/stores
- ✅ Redirects to /vendor/dashboard
- ✅ Success message or dashboard displays

**Verification:**
```javascript
JSON.parse(localStorage.getItem('aether_onboarding'));
// Should show:
// {
//   "state": {
//     "userRole": "seller",
//     "sellerTier": "distributor",
//     "onboardingCompleted": true,
//     "currentStep": 3
//   }
// }
```

**Pass Criteria:**
- ✅ Redirects to /vendor/dashboard
- ✅ onboardingCompleted is true
- ✅ userRole is "seller"
- ✅ sellerTier is "distributor"

---

### **TEST 6: Wallet Reconnection Preserves Onboarding**

**Objective:** Verify onboarding state survives wallet disconnect/reconnect

**Prerequisites:** Completed TEST 5 (seller onboarded)

**Steps:**
1. In Phantom wallet, click "Disconnect" (or use disconnect button in app)
2. Verify wallet is disconnected from site
3. In Phantom, reconnect to site

**Expected Behavior:**
- ✅ User does NOT see /onboarding page
- ✅ Should recognize seller role
- ✅ Can navigate to vendor dashboard

**Verification:**
```javascript
// After reconnect:
JSON.parse(localStorage.getItem('aether_onboarding'));
// Should show same seller state with onboardingCompleted: true
```

**Pass Criteria:**
- ✅ No redirect to /onboarding
- ✅ State preserved exactly
- ✅ User can access /vendor/dashboard without re-onboarding

---

### **TEST 7: Registration Form Draft Persists on Error**

**Objective:** Verify form data retained if submission fails

**Steps:**
1. localStorage.clear() and reload
2. Go to /vendor/register (must be wallet connected)
3. Fill form with:
   - Shop Name: "Test Shop"
   - Description: "Test Description"
   - Vendor Type: "Wholesaler"
   - Email: "test@example" (INVALID - missing .com)
   - Categories: "Electronics"
4. Click "Register Vendor"

**Expected Behavior:**
- ✅ Should show error message
- ✅ Form fields remain filled

**Verification:**
```javascript
JSON.parse(localStorage.getItem('aether_registration_draft'));
// All fields still there
```

5. Fix email to "test@example.com"
6. Click "Register Vendor" again

**Expected Behavior:**
- ✅ Should succeed (or may fail with different backend error, but form still persists)

**Pass Criteria:**
- ✅ Form data persists through error
- ✅ User doesn't need to re-enter data
- ✅ Can retry without data loss

---

### **TEST 8: Page Navigation Preserves State**

**Objective:** Verify state persists when navigating between routes

**Setup:** Buyer onboarded (TEST 4)

**Steps:**
1. From /dashboard, navigate to /onboarding
2. Should see role selection page (because buyer already onboarded, may auto-redirect)
   - Actually, may redirect back to /dashboard because onboardingCompleted is true
3. Go to /vendor/register
4. Fill shop name: "Test"
5. Navigate to /marketplace
6. Go back to /vendor/register

**Expected Behavior:** ✅ Shop name field still shows "Test"

**Verification:**
```javascript
JSON.parse(localStorage.getItem('aether_registration_draft'));
// Should show shopName: "Test"
```

**Pass Criteria:**
- ✅ Form data persisted across route navigation
- ✅ localStorage not cleared by route changes

---

### **TEST 9: Browser Storage Visibility**

**Objective:** Verify localStorage entries are visible in DevTools

**Steps:**
1. Open DevTools (F12)
2. Go to "Application" tab
3. Left sidebar → "Storage" → "Local Storage"
4. Select http://localhost:3000

**Expected Entries:**
```
aether_onboarding: {"state":{...},"version":1}
aether_registration_draft: {"state":{...},"version":1}
aether_cart: {...} // Already existing
```

**Pass Criteria:**
- ✅ Both new entries visible
- ✅ Cart entry still present (no interference)
- ✅ Entries survive page refresh

---

### **TEST 10: Incognito/Private Window = Fresh State**

**Objective:** Verify localStorage is not shared across browser contexts

**Steps:**
1. Complete buyer onboarding in normal window
2. Open NEW incognito/private window
3. Go to http://localhost:3000/onboarding

**Expected Behavior:** ✅ Should show role selection (fresh state)

**Verification:**
```javascript
// In incognito window:
localStorage.getItem('aether_onboarding'); // Should be null
```

**Pass Criteria:**
- ✅ Incognito shows role selection page
- ✅ localStorage is empty (separate context)
- ✅ Normal window unaffected

---

### **TEST 11: Different Wallet = Fresh Onboarding**

**Objective:** Verify role persists even when switching wallets (current behavior)

**Setup:** Connected with Wallet A (seller onboarded)

**Steps:**
1. Disconnect Wallet A
2. Connect Wallet B (different address)
3. Go to /onboarding

**Current Behavior:** ✅ May NOT redirect to onboarding (state is global, not keyed by wallet)

**Decision Point:**
- Is this desired? (Single role per browser, or per wallet?)
- If per-wallet needed, state keys should be: `aether_onboarding_${walletAddress}`

**Pass Criteria (Current Design):**
- ✅ Wallet B recognizes onboarding from Wallet A
- ✅ Or redirects to onboarding (design decision)

---

## EDGE CASES

### **Edge Case 1: localStorage Quota Exceeded**
- Current state uses ~1-2 KB; unlikely to be issue
- Zustand handles gracefully if write fails

### **Edge Case 2: Browser Clears localStorage**
- User's onboarding state lost
- User returned to role selection
- Expected behavior

### **Edge Case 3: Malformed localStorage Data**
- Zustand has fallback logic
- Component initializes with default values
- Form fields empty if draft corrupted

### **Edge Case 4: Multiple Tabs Open**
- Both tabs share localStorage
- If user submits form in Tab 1, Tab 2 will see `registrationCompleted: true`
- Register form should prevent double-submit server-side

---

## TROUBLESHOOTING

### Issue: Form Fields Empty After Refresh
**Cause:** localStorage key mismatch or Zustand not initialized  
**Fix:** Check browser DevTools → Application → LocalStorage → verify key exists

### Issue: State Not Persisting
**Cause:** localStorage disabled in browser  
**Fix:** Enable localStorage in browser settings

### Issue: Redirect Loop (Onboarding ↔ Dashboard)
**Cause:** onboardingCompleted flag not set correctly  
**Fix:** Check console logs; verify `markOnboardingComplete()` called

### Issue: Form Fields Not Updating
**Cause:** Store subscription not firing  
**Fix:** Verify `onChange` handlers call store setters

---

## SUCCESS CRITERIA

✅ **All 11 tests pass**  
✅ **No console errors**  
✅ **Build succeeds with no warnings**  
✅ **localStorage shows both new entries**  
✅ **Page refresh never returns user to role selection (if already onboarded)**  
✅ **Form fields survive page refresh**  
✅ **Wallet disconnect/reconnect preserves state**

---

## SIGN-OFF

After all tests pass, the following issues are RESOLVED:

- [x] PROBLEM 1: Onboarding Loop (Role Selection asks every time)
  - User role now persisted
  - Survivor page refresh and wallet disconnect/reconnect
  - No redirect loop

- [x] PROBLEM 2: Vendor Registration State Lost on Page Refresh
  - All form data persisted to localStorage
  - Draft auto-saves on every field change
  - Form survives page refresh and wallet events

---

## NEXT STEPS (Out of Scope)

1. **Middleware Router Guard** - Add /middleware.ts for route protection
2. **Comprehensive Tests** - Add E2E tests with Playwright/Cypress
3. **Wallet-Keyed State** - If per-wallet onboarding needed, update store keys
4. **Analytics** - Track onboarding completion rates
5. **Error Recovery** - Add retry logic for vendor store creation failures

