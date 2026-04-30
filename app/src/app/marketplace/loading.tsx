export default function MarketplaceLoading() {
  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem', height: 28, width: 200, background: 'rgba(255,255,255,0.06)', borderRadius: 6 }} />
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ height: 32, width: 80, background: 'rgba(255,255,255,0.06)', borderRadius: 999 }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} style={{ padding: '1.25rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(17,24,39,0.95)' }}>
            <div style={{ height: 20, width: '70%', background: 'rgba(255,255,255,0.06)', borderRadius: 4 }} />
            <div style={{ height: 14, width: '90%', background: 'rgba(255,255,255,0.04)', borderRadius: 4 }} />
            <div style={{ height: 14, width: '60%', background: 'rgba(255,255,255,0.04)', borderRadius: 4 }} />
            <div style={{ height: 36, marginTop: 'auto', background: 'rgba(255,255,255,0.06)', borderRadius: 6 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
