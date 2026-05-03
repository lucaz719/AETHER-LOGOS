'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Trash2, ArrowLeft, ShoppingCart } from 'lucide-react';
import { useCart } from '@/hooks/useCart';

export default function CartPage() {
  const { items, removeItem, clearCart } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Convert from micro-USDC (6 decimals) to USDC
  const subtotal = items.reduce((sum, item) => sum + item.priceUsdc * item.quantity / 1_000_000, 0);
  const platformFee = subtotal * 0.02; // 2% platform fee
  const total = subtotal + platformFee;

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center space-y-6">
            <div className="inline-flex p-4 bg-secondary rounded-xl">
              <ShoppingCart className="h-12 w-12 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Your cart is empty</h1>
              <p className="text-muted-foreground">
                Add items to your cart to get started with procurement
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-blue-700 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Continue Shopping
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-primary hover:underline mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold">Shopping Cart</h1>
          <p className="text-muted-foreground mt-1">
            {items.length} {items.length === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={item.listingPubkey}
                className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Vendor: {item.vendorPubkey.slice(0, 8)}...
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <span>Qty: {item.quantity}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-foreground">
                      ${(item.priceUsdc / 1_000_000 * item.quantity).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ${(item.priceUsdc / 1_000_000).toFixed(2)} each
                    </p>
                    <button
                      onClick={() => removeItem(item.listingPubkey)}
                      className="mt-3 inline-flex items-center gap-1 px-2 py-1 rounded text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 h-fit sticky top-32">
            <h2 className="text-lg font-semibold mb-6">Order Summary</h2>

            <div className="space-y-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform Fee (2%)</span>
                <span className="font-semibold">${platformFee.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between mb-6">
              <span className="font-semibold text-foreground">Total</span>
              <span className="text-2xl font-bold text-primary">
                ${total.toFixed(2)}
              </span>
            </div>

            <button
              onClick={() => setIsCheckingOut(true)}
              className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold transition-all duration-200 hover:bg-blue-700 active:scale-95 mb-3"
            >
              Proceed to Checkout
            </button>

            <button
              onClick={() => clearCart()}
              className="w-full h-10 rounded-lg border border-gray-200 dark:border-gray-800 text-muted-foreground hover:bg-secondary transition"
            >
              Clear Cart
            </button>

            {/* Info Box */}
            <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30">
              <p className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                💡 Your funds will be locked in a secure smart contract escrow. Once the seller confirms delivery via tracking, your USDC is automatically released.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
