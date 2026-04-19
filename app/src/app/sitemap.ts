import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aether-logos.xyz";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: `${siteUrl}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/trades`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/markets`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];
}
