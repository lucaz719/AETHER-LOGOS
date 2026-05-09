# AETHER-LOGOS Critical Audit: Onboarding & Vendor Registration State Management

**Date:** 2026-05-04  
**Severity:** CRITICAL  
**Status:** Diagnosed, Ready for Implementation

---

## EXECUTIVE SUMMARY

The AETHER-LOGOS app has **two critical state management failures**:

1. **Onboarding Loop (Role Selection)**: User role selection is stored only in React component state, not persisted. Every refresh or redirect returns user to the role selection screen.

2. **Vendor Registration State Loss**: Multi-step vendor registration form data is not persisted. Page refresh loses all entered data (shop name, categories, vendor type, email).

**Root Cause:** No global state management. All state lives in component-level `useState()` without localStorage or context-level persistence.

**Impact:** Users cannot complete onboarding or vendor registration reliably. Critical flow failures.

---

## DIAGNOSIS: ALL BUGS IDENTIFIED

### BUG #1: Onboarding Role Selection Not Persisted
**Component:** `app/src/app/onboarding/page.tsx`  
**Severity:** CRITICAL  
**Root Cause:** 
```typescript
const [path, setPath] = useState<"none" | "buyer" | "vendor">("none");
```
- State stored only in React component.
- On page refresh or redirect → component unmounts → state lost → user sees role selection again.
- No localStorage sync.
- No context wrapper.

**Evidence:**
- Line 27: `path` state initialized to "none" every render
- Lines 134, 147: onClick handlers set path but do not persist
- No useEffect with localStorage.setItem()

---

### BUG #2: Seller Tier Selection Not Persisted
**Component:** `app/src/app/onboarding/page.tsx`  
**Severity:** CRITICAL  
**Root Cause:**
```typescript
const [sellerTier, setSellerTier] = useState<SellerTier>(null);
```
- Line 29: Tier selection reset on every component mount
- User selects "Distributor" → clicks "Continue" to step 2 → page refreshes → tier lost → back to tier selection

---

### BUG #3: Vendor Registration Form Data Lost on Refresh
**Component:** `app/src/app/vendor/register/page.tsx`  
**Severity:** CRITICAL  
**Root Cause:**
```typescript
const [shopName, setShopName] = useState("");
const [shopDesc, setShopDesc] = useState("");
const [vendorType, setVendorType] = useState<string>("Retailer");
const [categories, setCategories] = useState<string[]>([]);
const [email, setEmail] = useState("");
```
- Lines 22-26: All form data stored in local state only
- User fills out entire form → accidental page refresh → **all data lost**
- No "Save Draft" functionality
- No localStorage recovery

---

### BUG #4: No Check for "Already Onboarded"
**Component:** `app/src/app/onboarding/page.tsx`  
**Severity:** HIGH  
**Root Cause:**
- Lines 82-86: Only checks if `profile && !loading`, then redirects to `/vendor/dashboard`
- But the check is **inside the onboarding component itself**
- If user navigates directly to `/onboarding` after already onboarding, the check fires
- BUT: If user clicks "Launch App" button on landing page, they are redirected to `/onboarding` **regardless of onboarding status**
- See `app/src/app/page.tsx` line 40-44: All "Launch App" buttons link to `/onboarding` without checking status first

---

### BUG #5: No Middleware Router Guard
**Component:** Missing `middleware.ts`  
**Severity:** HIGH  
**Root Cause:**
- No Next.js middleware to intercept protected routes
- User can navigate directly to `/marketplace`, `/vendor/dashboard`, `/vendor/register` without onboarding
- No route protection at all

---

### BUG #6: No Global State Management Architecture
**Component:** Entire `app/src` directory  
**Severity:** CRITICAL  
**Root Cause:**
- `package.json` has no Zustand, Redux, Recoil, or Context-based state library
- `app/src/lib/` has no store directory or state files
- Only CartProvider uses localStorage correctly (see `app/src/hooks/useCart.tsx`)
- All other state lives in component `useState()` without persistence

---

### BUG #7: Vendor Profile Fetch Race Condition
**Component:** `app/src/app/vendor/dashboard/page.tsx`  
**Severity:** MEDIUM  
**Root Cause:**
- Lines 63-98: useEffect fetches vendor profile on every `[walletAddr, escrowProgram]` change
- No caching: consecutive loads re-fetch the same data
- If user's vendor profile is just created via `/onboarding`, the profile endpoint might not have data yet
- No retry logic or debouncing

---

### BUG #8: No Vendor Status Persistence After Registration
**Component:** `app/src/app/onboarding/page.tsx` (vendor path)  
**Severity:** HIGH  
**Root Cause:**
- Lines 40-79: `completeVendorSetup()` calls `POST /api/stores` to create vendor store
- Response check: `if (!response.ok && response.status !== 409)` — treats 409 (conflict/already exists) as success
- After successful creation, immediately redirects to `/vendor/dashboard`
- BUT: No localStorage flag to mark "vendor_onboarding_complete"
- No mechanism to prevent user from being re-asked role on next session if they disconnect/reconnect wallet

---

## FILES INVOLVED IN THE PROBLEM

| File | Role | Issue |
|------|------|-------|
| `app/src/app/onboarding/page.tsx` | Role/Tier Selection, Vendor Setup | State not persisted; no onboarding-complete flag |
| `app/src/app/vendor/register/page.tsx` | Vendor Registration Form | Form data not persisted; lost on refresh |
| `app/src/app/page.tsx` | Landing Page | All CTAs link to `/onboarding` without checking onboarding status |
| `app/src/app/layout.tsx` | Root Layout | No AuthProvider or route guard context |
| `app/src/app/dashboard/page.tsx` | Buyer Dashboard | Can be accessed without onboarding |
| `app/src/app/vendor/dashboard/page.tsx` | Vendor Dashboard | Can be accessed without onboarding; vendor profile fetch race condition |
| `app/src/app/marketplace/page.tsx` | Marketplace | Can be accessed without onboarding |
| `app/src/lib/wallet-provider.tsx` | Wallet Setup | Correctly sets up Solana, but no auth context above it |
| `app/src/hooks/useCart.tsx` | Cart State | ✅ **CORRECT PATTERN** — Uses localStorage with React Context |
| `package.json` | Dependencies | Missing Zustand (or equivalent) for global state |

---

## STATE MANAGEMENT ARCHITECTURE: CURRENT vs PROPOSED

### Current (Broken)
```
Landing Page (page.tsx)
  └─ Link to /onboarding [No onboarding status check]
     └─ Onboarding (useState, no persist)
        └─ Role not saved
        └─ Vendor tier lost on refresh
        └─ Form data lost on refresh
```

### Proposed (Fixed)
```
Root Layout (layout.tsx)
  └─ AuthProvider [Context + Zustand store]
     ├─ Middleware guard (middleware.ts)
     └─ All routes have access to auth state
        
Landing Page → Check auth store
  ├─ If onboardingCompleted → redirect to /marketplace or /vendor/dashboard
  └─ If not → show landing with "Launch App" linking to /onboarding

Onboarding Page → Use auth store (Zustand)
  ├─ Persist role selection to localStorage
  ├─ Persist tier selection to localStorage
  ├─ On mount: hydrate from localStorage
  └─ On complete: set onboardingCompleted=true

Vendor Register → Use registration store (Zustand)
  ├─ Persist form data to localStorage
  ├─ On mount: hydrate form from localStorage
  ├─ Auto-save each field change
  └─ On submit: clear store, set completed flag

Protected Routes (/marketplace, /vendor/*, /dashboard)
  └─ Middleware check: if not onboardingCompleted → redirect to /onboarding
```

---

## RECOMMENDED SOLUTION

### Phase 1: Install Zustand
Add Zustand to `package.json`:
```bash
npm install zustand
```
- Lightweight (2.3KB gzipped)
- No boilerplate
- Perfect for cross-component state + localStorage sync
- Already used pattern in production

### Phase 2: Create Global State Stores

**`app/src/lib/stores/onboardingStore.ts`** — Single source of truth for user role & onboarding status
```typescript
export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      userRole: null,
      vendorTier: null,
      onboardingCompleted: false,
      setUserRole: (role) => set({ userRole: role }),
      setVendorTier: (tier) => set({ vendorTier: tier }),
      markOnboardingComplete: () => set({ onboardingCompleted: true }),
      reset: () => set({ userRole: null, vendorTier: null, onboardingCompleted: false }),
    }),
    {
      name: 'aether_onboarding',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

**`app/src/lib/stores/registrationStore.ts`** — Vendor registration multi-step form
```typescript
export const useRegistrationStore = create<RegistrationState>()(
  persist(
    (set) => ({
      shopName: '',
      shopDesc: '',
      vendorType: 'Retailer',
      categories: [],
      email: '',
      currentStep: 1,
      setShopName: (name) => set({ shopName: name }),
      // ... other setters
      markCompleted: () => set({ completed: true }),
      clearDraft: () => set({ /* reset all */ }),
    }),
    {
      name: 'aether_registration_draft',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

### Phase 3: Refactor Components

**`onboarding/page.tsx`** — Use store instead of useState
**`vendor/register/page.tsx`** — Use store with auto-save + draft recovery
**`page.tsx`** — Check onboarding status before linking to /onboarding

### Phase 4: Add Route Middleware

**`middleware.ts`** — Intercept protected routes and check onboarding status

### Phase 5: Update Root Layout

**`layout.tsx`** — Wrap with providers in correct order

---

## VERIFICATION CHECKLIST

After implementing fixes, verify each scenario:

### **Onboarding Loop Fix**
- [ ] Select "I want to Sell" → page persists in localStorage
- [ ] Refresh page → still shows "Complete Your Profile" step, not role selection
- [ ] Select seller tier → page persists
- [ ] Refresh page → tier is preserved
- [ ] Complete onboarding → redirect to `/vendor/dashboard`
- [ ] Return to home page → clicking "Launch App" redirects to `/vendor/dashboard` (not `/onboarding`)
- [ ] Disconnect wallet → reconnect same wallet → `/onboarding` should not appear (should auto-redirect to dashboard)

### **Vendor Registration Form Persistence**
- [ ] Fill shop name, description, categories
- [ ] Refresh page mid-form → all fields populated from localStorage
- [ ] Click "Save Draft" (if added) → success message
- [ ] Navigate away and back → draft still there
- [ ] Submit form → success
- [ ] Form clears and shows "Vendor registered successfully!"
- [ ] Refresh → shows dashboard, not empty form

### **Middleware Route Guard**
- [ ] Unauthenticated user navigates to `/vendor/dashboard` → redirects to `/onboarding`
- [ ] Unauthenticated user navigates to `/marketplace` → redirects to `/onboarding`
- [ ] Authenticated buyer navigates to `/vendor/dashboard` → rejected (buyer-only routes)
- [ ] Authenticated vendor navigates to `/marketplace` → allowed (vendors can also browse)

### **Wallet Reconnection**
- [ ] Complete onboarding as Seller
- [ ] Disconnect wallet from wallet adapter
- [ ] Reconnect same wallet
- [ ] App remembers onboarding status → no onboarding loop
- [ ] Connect different wallet → fresh onboarding flow

### **Cross-Browser Persistence**
- [ ] Complete onboarding in Chrome
- [ ] Open Firefox and login with same wallet
- [ ] Onboarding state is fresh (localStorage is browser-specific)
- [ ] Complete onboarding in Firefox
- [ ] Return to Chrome → onboarding status still there

---

## MIGRATION GUIDE FOR FUTURE STATE

All new state that needs to be shared across components should:

1. **Live in a Zustand store** (not useState)
2. **Be persisted to localStorage** (using Zustand persist middleware)
3. **Be wrapped in a Context provider** (for TypeScript + testing)
4. **Be hydrated on app mount** (useEffect or Context effect)

**Do NOT use useState for:**
- User role / authentication state
- Multi-step form data
- User preferences that should survive refresh
- Session data that spans multiple pages

**Use useState only for:**
- Transient UI state (hover, expand, loading during a single action)
- Form state within a single component that doesn't need recovery

---

## NEXT STEPS

1. ✅ Diagnosis complete (this document)
2. ⏳ Implement Phase 1-5 fixes (see IMPLEMENTATION_PLAN.md)
3. ⏳ Run verification checklist
4. ⏳ Update docs
5. ⏳ Commit and deploy

