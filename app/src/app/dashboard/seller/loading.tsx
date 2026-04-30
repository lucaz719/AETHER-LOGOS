export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-[#0a0a0f]">
      <div className="border-b border-white/10 bg-[#12121a]/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div style={{ height: 36, width: 260, background: 'rgba(255,255,255,0.06)', borderRadius: 6 }} />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-[#12121a] border border-white/10 rounded-xl p-6">
              <div style={{ height: 14, width: 80, background: 'rgba(255,255,255,0.06)', borderRadius: 4, marginBottom: '0.75rem' }} />
              <div style={{ height: 40, width: 100, background: 'rgba(255,255,255,0.08)', borderRadius: 4 }} />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[#12121a] border border-white/10 rounded-xl p-6">
              <div style={{ height: 20, width: '50%', background: 'rgba(255,255,255,0.06)', borderRadius: 4, marginBottom: '0.75rem' }} />
              <div style={{ height: 14, width: '70%', background: 'rgba(255,255,255,0.04)', borderRadius: 4 }} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
