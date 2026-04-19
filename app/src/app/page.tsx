import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Trade Escrow and Shipping Risk Hedging Dashboard",
  description:
    "AETHER-LOGOS enables zkTLS-verified delivery settlement for trade escrows and on-chain hedge markets for logistics risk.",
  alternates: {
    canonical: "/",
  },
};
export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "AETHER-LOGOS",
        url: "https://aether-logos.xyz",
        description:
          "A Solana protocol for asset-light trade escrow settlement and logistics risk hedging.",
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "How does AETHER-LOGOS settle trade escrows?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "AETHER-LOGOS settles trade escrows by holding buyer funds in a Solana escrow vault, verifying carrier delivery with zkTLS proofs, and then releasing funds on-chain when proof conditions are met.",
            },
          },
          {
            "@type": "Question",
            name: "What problem does the hedge market solve?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "The hedge market lets participants price and hedge shipping risks such as delays, congestion, and volatility. Users can take positions on outcomes tied to shipment data and reduce exposure to logistics uncertainty.",
            },
          },
        ],
      },
    ],
  };
  return (
    <main style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <h1>⚡ AETHER-LOGOS</h1>
      <p>
        AETHER-LOGOS is a Solana protocol that settles trade escrows using
        zkTLS delivery proofs and offers hedge markets for shipping risk.
      </p>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div style={{ marginTop: "2rem" }}>
        <h2>Dashboard</h2>
        <ul>
          <li>
            <Link href="/trades">Trade Escrow</Link>
          </li>
          <li>
            <Link href="/markets">Hedge Markets</Link>
          </li>
        </ul>
      </div>
      <div style={{ marginTop: "2rem" }}>
        <h2>How it works</h2>
        <ol>
          <li>Buyer deposits USDC into escrow</li>
          <li>Seller ships goods via DHL/FedEx/Maersk</li>
          <li>zkTLS proof verifies delivery on-chain</li>
          <li>Escrow automatically releases to seller</li>
        </ol>
      </div>
      <section style={{ marginTop: "2rem" }}>
        <h2>Frequently Asked Questions</h2>
        <h3>How does AETHER-LOGOS settle trade escrows?</h3>
        <p>
          AETHER-LOGOS settles trade escrows by locking buyer funds in a Solana
          escrow vault, validating delivery through zkTLS proofs from logistics
          data, and automatically releasing funds when proof criteria are
          satisfied.
        </p>
        <h3>What problem does the hedge market solve?</h3>
        <p>
          The hedge market helps users price and manage logistics risk by taking
          positions on shipment outcomes, including delay and congestion events,
          so trade participants can offset downside exposure.
        </p>
      </section>
    </main>
  );
}
