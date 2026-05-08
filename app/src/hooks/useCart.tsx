'use client';

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { toAtoms, toUsd } from "@/lib/units";

export type CartItem = {
  listingPubkey: string;
  vendorPubkey: string;
  vendorAuthority: string;
  title: string;
  priceUsdc: number; // micro-USDC (6 decimals)
  quantity: number;
  imagesCid?: string;
  tier?: string;
  moq?: number;
  leadTimeDays?: number;
};

type CartContextType = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (listingPubkey: string) => void;
  updateQty: (listingPubkey: string, quantity: number) => void;
  clearCart: () => void;
  totalUsdc: number;
  totalUsd: number;
};

const CartContext = createContext<CartContextType>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQty: () => {},
  clearCart: () => {},
  totalUsdc: 0,
  totalUsd: 0,
});

const STORAGE_KEY = "aether_cart";

function normalizeToAtoms(value: number): number {
  if (!Number.isFinite(value)) return 0;
  // Cart contract expects atoms; large integer values are already atom-denominated.
  if (Number.isInteger(value) && value >= 1_000_000) return value;
  return toAtoms(value);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {}
  }, []);

  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }, []);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
      setItems((prev) => {
        const qty = item.quantity ?? 1;
        const existing = prev.find((i) => i.listingPubkey === item.listingPubkey);
        const next = existing
          ? prev.map((i) =>
              i.listingPubkey === item.listingPubkey ? { ...i, quantity: i.quantity + qty } : i,
            )
          : [...prev, { ...item, priceUsdc: normalizeToAtoms(item.priceUsdc), quantity: qty }];
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
        return next;
      });
    },
    [],
  );

  const removeItem = useCallback((listingPubkey: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.listingPubkey !== listingPubkey);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const updateQty = useCallback((listingPubkey: string, quantity: number) => {
    if (quantity <= 0) { removeItem(listingPubkey); return; }
    setItems((prev) => {
      const next = prev.map((i) =>
        i.listingPubkey === listingPubkey ? { ...i, quantity } : i,
      );
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [removeItem]);

  const clearCart = useCallback(() => persist([]), [persist]);

  const totalUsdc = items.reduce((acc, i) => acc + i.priceUsdc * i.quantity, 0);
  const totalUsd = toUsd(totalUsdc);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, totalUsdc, totalUsd }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
