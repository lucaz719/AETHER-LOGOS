import type { Metadata } from "next";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aether-logos.xyz";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AETHER-LOGOS | Asset-Light Trade Settlement Protocol",
    template: "%s | AETHER-LOGOS",
  },
  description:
    "AETHER-LOGOS is a Solana-based protocol for trade escrow settlement with zkTLS delivery proofs and prediction markets for logistics risk hedging.",
  keywords: [
    "trade settlement protocol",
    "Solana escrow",
    "zkTLS logistics proof",
    "prediction market hedging",
    "global trade finance",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "AETHER-LOGOS",
    title: "AETHER-LOGOS | Asset-Light Trade Settlement Protocol",
    description:
      "Settle cross-border trade escrows with zkTLS-verified delivery and hedge shipping risk via on-chain prediction markets.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AETHER-LOGOS | Trade Settlement Protocol",
    description:
      "Trade escrow settlement on Solana with zkTLS delivery proofs and hedge markets.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
