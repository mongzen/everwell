import type { Metadata } from 'next';
import DriftGame from '@/components/drift/DriftGame';
import './drift.css';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://everwell.co.th';
const TITLE = 'Drift — a calming jellyfish aquarium & breathing game';
const DESC =
  'Drift is a free, quiet jellyfish aquarium for your browser. No goals, no timer — watch glowing jellyfish float through the dark, follow a slow breathing guide and unwind with ambient music.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESC,
  keywords: [
    'jellyfish aquarium', 'relaxing browser game', 'calming game', 'breathing exercise',
    'guided breathing', 'stress relief', 'ambient music', 'virtual aquarium', 'mindfulness',
  ],
  alternates: { canonical: '/drift' },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
  openGraph: {
    type: 'website',
    url: '/drift',
    siteName: 'Everwell',
    title: TITLE,
    description: DESC,
    locale: 'en_US',
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC },
  category: 'health',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      '@id': `${SITE}/drift#app`,
      name: 'Drift',
      url: `${SITE}/drift`,
      description: DESC,
      applicationCategory: 'HealthApplication',
      genre: 'Relaxation',
      operatingSystem: 'Any (modern web browser with WebGL)',
      browserRequirements: 'Requires WebGL',
      inLanguage: 'en',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'THB' },
      publisher: { '@type': 'Organization', name: 'Everwell', url: SITE },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Everwell', item: SITE },
        { '@type': 'ListItem', position: 2, name: 'Drift', item: `${SITE}/drift` },
      ],
    },
  ],
};

export default function DriftPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <DriftGame />
      <noscript>
        <p style={{ position: 'fixed', inset: 'auto 0 24px', textAlign: 'center', color: '#cfe', zIndex: 10 }}>
          Drift is a quiet jellyfish aquarium with guided breathing and ambient music. Please enable JavaScript to play.
        </p>
      </noscript>
    </>
  );
}
