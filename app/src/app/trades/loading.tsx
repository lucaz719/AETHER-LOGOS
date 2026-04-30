export default function TradesLoading() {
  return (
    <main className="min-h-screen bg-[#0a0a0f]">
      <div className="border-b border-white/10 bg-[#12121a]/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div style={{ height: 36, width: 220, background: 'rgba(255,255,255,0.06)', borderRadius: 6 }} />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-[#12121a] border border-white/10 rounded-xl p-6" style={{ animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }}>
            <div style={{ height: 24, width: '40%', background: 'rgba(255,255,255,0.06)', borderRadius: 4, marginBottom: '0.75rem' }} />
            <div style={{ height: 16, width: '60%', background: 'rgba(255,255,255,0.04)', borderRadius: 4 }} />
          </div>
        ))}
      </div>
    </main>
  );
}
