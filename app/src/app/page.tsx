export default function Home() {
  return (
    <main style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <h1>⚡ AETHER-LOGOS</h1>
      <p>Asset-Light Trade Settlement Protocol on Solana</p>
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
          <li>Buyer deposits USDC into escrow</li>
          <li>Seller ships goods via DHL/FedEx/Maersk</li>
          <li>zkTLS proof verifies delivery on-chain</li>
          <li>Escrow automatically releases to seller</li>
        </ol>
      </div>
    </main>
  );
}
