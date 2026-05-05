'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useOnboardingStore } from '../stores/onboardingStore';

interface OnboardingContextType {
  isHydrated: boolean;
  onboardingCompleted: boolean;
  userRole: 'buyer' | 'seller' | null;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const onboardingCompleted = useOnboardingStore((state) => state.onboardingCompleted);
  const userRole = useOnboardingStore((state) => state.userRole as 'buyer' | 'seller' | null);

  useEffect(() => {
    // Zustand hydration from localStorage is synchronous, but we need to wait for client mount
    setIsHydrated(true);
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        isHydrated,
        onboardingCompleted,
        userRole,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}
