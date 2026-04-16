export default function MarketsPage() {
  return (
    <main style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <h1>Hedge Markets</h1>
      <p>Trade risk prediction markets — hedge against delays, port congestion, and price spikes.</p>

      <section style={{ marginTop: "2rem" }}>
        <h2>Open Markets</h2>
        <p>No open markets yet. Markets are created when shipments are registered.</p>
        {/* Market cards with Yes/No buttons and pot size will be implemented here */}
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Your Positions</h2>
        <p>Connect your wallet to view your hedge positions.</p>
      </section>
    </main>
  );
}
