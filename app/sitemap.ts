import type { MetadataRoute } from 'next';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://everwell.co.th';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE, lastModified: now, changeFrequency: 'monthly', priority: 1 },
    { url: `${SITE}/drift`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
  ];
}
