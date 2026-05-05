import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface RegistrationState {
  shopName: string;
  shopDesc: string;
  vendorType: string;
  categories: string[];
  email: string;
  currentStep: number;
  registrationCompleted: boolean;
  
  setShopName: (name: string) => void;
  setShopDesc: (desc: string) => void;
  setVendorType: (type: string) => void;
  setCategories: (categories: string[]) => void;
  setEmail: (email: string) => void;
  setCurrentStep: (step: number) => void;
  markRegistrationComplete: () => void;
  clearDraft: () => void;
}

export const useRegistrationStore = create<RegistrationState>()(
  persist(
    (set) => ({
      shopName: '',
      shopDesc: '',
      vendorType: 'Retailer',
      categories: [],
      email: '',
      currentStep: 1,
      registrationCompleted: false,
      
      setShopName: (name) => set({ shopName: name }),
      setShopDesc: (desc) => set({ shopDesc: desc }),
      setVendorType: (type) => set({ vendorType: type }),
      setCategories: (categories) => set({ categories }),
      setEmail: (email) => set({ email }),
      setCurrentStep: (step) => set({ currentStep: step }),
      markRegistrationComplete: () => set({ registrationCompleted: true }),
      clearDraft: () => set({
        shopName: '',
        shopDesc: '',
        vendorType: 'Retailer',
        categories: [],
        email: '',
        currentStep: 1,
        registrationCompleted: false,
      }),
    }),
    {
      name: 'aether_registration_draft',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);
