import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type UserRole = 'buyer' | 'seller' | null;
export type SellerTier = 'distributor' | 'wholesaler' | 'manufacturer' | null;

interface OnboardingState {
  userRole: UserRole;
  sellerTier: SellerTier;
  onboardingCompleted: boolean;
  currentStep: number;
  
  setUserRole: (role: UserRole) => void;
  setSellerTier: (tier: SellerTier) => void;
  setCurrentStep: (step: number) => void;
  markOnboardingComplete: () => void;
  reset: () => void;
  hydrate: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      userRole: null,
      sellerTier: null,
      onboardingCompleted: false,
      currentStep: 1,
      
      setUserRole: (role) => set({ userRole: role }),
      setSellerTier: (tier) => set({ sellerTier: tier }),
      setCurrentStep: (step) => set({ currentStep: step }),
      markOnboardingComplete: () => set({ onboardingCompleted: true }),
      reset: () => set({ 
        userRole: null, 
        sellerTier: null, 
        onboardingCompleted: false,
        currentStep: 1,
      }),
      hydrate: () => {
        // No-op: Zustand handles hydration automatically
      },
    }),
    {
      name: 'aether_onboarding',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);
