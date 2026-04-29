'use client';

import Link from 'next/link';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#0a0a0f] to-[#12121a]">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 tracking-tight">
          Trustless Trade Settlement on Solana
        </h1>
        <p className="text-xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
          Atomic escrow with cryptographic proof of delivery. Settle global trade in seconds without intermediaries.
        </p>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mb-16 max-w-3xl mx-auto">
          <div className="bg-[#12121a] border border-white/10 rounded-lg px-6 py-4 backdrop-blur">
            <div className="text-3xl font-bold text-purple-400">$2.5T</div>
            <div className="text-sm text-gray-400 mt-1">Financing Gap</div>
          </div>
          <div className="bg-[#12121a] border border-white/10 rounded-lg px-6 py-4 backdrop-blur">
            <div className="text-3xl font-bold text-teal-400">220+</div>
            <div className="text-sm text-gray-400 mt-1">Countries Covered</div>
          </div>
          <div className="bg-[#12121a] border border-white/10 rounded-lg px-6 py-4 backdrop-blur">
            <div className="text-3xl font-bold text-purple-400">&lt;30s</div>
            <div className="text-sm text-gray-400 mt-1">Settlement Time</div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/dashboard/buyer"
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-lg transition shadow-lg hover:shadow-purple-500/50 shadow-purple-500/20"
          >
            I&apos;m a Buyer
          </Link>
          <Link
            href="/dashboard/seller"
            className="px-8 py-4 border border-purple-500/50 hover:border-purple-500 text-white font-semibold rounded-lg transition hover:bg-purple-500/10"
          >
            I&apos;m a Seller
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-white mb-16 text-center">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-[#12121a] border border-white/10 rounded-xl p-8 backdrop-blur hover:border-purple-500/30 transition">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mb-6">
              <span className="text-white text-xl font-bold">1</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-4">Atomic Escrow</h3>
            <p className="text-gray-400 leading-relaxed">
              Buyer locks USDC in a secure PDA vault. Funds are held until cryptographic proof of delivery is verified.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-[#12121a] border border-white/10 rounded-xl p-8 backdrop-blur hover:border-teal-500/30 transition">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center mb-6">
              <span className="text-white text-xl font-bold">2</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-4">zkTLS Proofs</h3>
            <p className="text-gray-400 leading-relaxed">
              Agent monitors carrier APIs and generates cryptographic proofs from delivery signatures using zkTLS protocol.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-[#12121a] border border-white/10 rounded-xl p-8 backdrop-blur hover:border-purple-500/30 transition">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-teal-500 rounded-lg flex items-center justify-center mb-6">
              <span className="text-white text-xl font-bold">3</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-4">Prediction Markets</h3>
            <p className="text-gray-400 leading-relaxed">
              Parimutuel markets let participants hedge shipping risk. Win proportional payouts based on market prediction accuracy.
            </p>
          </div>
        </div>
      </section>

      {/* Process Steps */}
      <section className="max-w-7xl mx-auto px-6 py-20 bg-[#12121a]/50 rounded-2xl border border-white/10 mb-20">
        <h2 className="text-3xl font-bold text-white mb-12 text-center">The Settlement Process</h2>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-500/20 border border-purple-500/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-purple-400 font-bold">→</span>
            </div>
            <h4 className="font-semibold text-white mb-2">Create</h4>
            <p className="text-sm text-gray-400">Buyer creates trade and locks USDC</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-teal-500/20 border border-teal-500/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-teal-400 font-bold">→</span>
            </div>
            <h4 className="font-semibold text-white mb-2">Ship</h4>
            <p className="text-sm text-gray-400">Seller submits tracking info</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-500/20 border border-purple-500/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-purple-400 font-bold">→</span>
            </div>
            <h4 className="font-semibold text-white mb-2">Prove</h4>
            <p className="text-sm text-gray-400">Agent verifies delivery with proof</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500/20 border border-green-500/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-green-400 font-bold">✓</span>
            </div>
            <h4 className="font-semibold text-white mb-2">Settle</h4>
            <p className="text-sm text-gray-400">Funds released to seller</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-500 text-sm">
            Built for the Solana Frontier Hackathon 2026
          </p>
        </div>
      </footer>
    </main>
  );
}
