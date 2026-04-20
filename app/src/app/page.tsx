export default function Home() {
  return (
    <main style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <h1>⚡ AETHER-LOGOS</h1>
      <p>Asset-Light Trade Settlement Protocol on Solana</p>
      <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem" }}>
        <a href="/dashboard/buyer" style={{ padding: "0.6rem 1rem", border: "1px solid #222", borderRadius: 8 }}>
          I&apos;m a Buyer
        </a>
        <a href="/dashboard/seller" style={{ padding: "0.6rem 1rem", border: "1px solid #222", borderRadius: 8 }}>
          I&apos;m a Seller
        </a>
      </div>
      <div style={{ marginTop: "2rem" }}>
        <h2>Dashboard</h2>
        <ul>
          <li><a href="/trades">Trade Escrow</a></li>
          <li><a href="/markets">Hedge Markets</a></li>
        </ul>
      </div>
      <div style={{ marginTop: "2rem" }}>
        <h3>How it works</h3>
        <ol>
          <li>Buyer creates an order and locks USDC in escrow.</li>
          <li>Seller submits tracking before the shipping deadline.</li>
          <li>Carrier milestones and zkTLS proof verify delivery.</li>
          <li>Buyer releases funds, or opens dispute/cancel if needed.</li>
        </ol>
      </div>
    </main>
  );
}
