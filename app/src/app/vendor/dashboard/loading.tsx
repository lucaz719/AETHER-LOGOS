export default function VendorDashboardLoading() {
  return (
    <main style={{ minHeight: '100vh', padding: '2rem 1.25rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ height: 36, width: 240, background: 'rgba(255,255,255,0.06)', borderRadius: 6, marginBottom: '1.5rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass" style={{ padding: '1.5rem' }}>
              <div style={{ height: 14, width: 80, background: 'rgba(255,255,255,0.06)', borderRadius: 4, marginBottom: '0.75rem' }} />
              <div style={{ height: 40, width: 100, background: 'rgba(255,255,255,0.08)', borderRadius: 4 }} />
            </div>
          ))}
        </div>
        <div style={{ height: 300, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }} />
      </div>
    </main>
  );
}
