export default function TradesPage() {
  return (
    <main style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <h1>Trade Escrow Dashboard</h1>
      <p>Create and manage trade escrows with zkTLS-verified delivery.</p>

      <section style={{ marginTop: "2rem" }}>
        <h2>Create New Trade</h2>
        <p>Connect your Solana wallet to create a trade escrow.</p>
        {/* Trade creation form will be implemented here */}
        {/* Fields: Item description, Price (USDC), Destination, Carrier, Tracking ID */}
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Active Trades</h2>
        <p>No active trades. Create one above to get started.</p>
        {/* Trade list with status badges will be implemented here */}
      </section>
    </main>
  );
}
