import type { Metadata } from 'next';
import ConstellationScene from '@/components/constellation/ConstellationScene';
import './constellation.css';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://everwell.co.th';
const TITLE = 'Constellation — every story becomes a star';
const DESC =
  'Tell Wren what is on your mind. Over time, your stories form constellations in a quiet night sky and the patterns behind them become easier to see.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESC,
  alternates: { canonical: '/constellation' },
  openGraph: { type: 'website', url: '/constellation', siteName: 'Everwell', title: TITLE, description: DESC },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC },
};

export default function ConstellationPage() {
  return (
    <>
      <ConstellationScene />
      <noscript>
        <p style={{ position: 'fixed', inset: 'auto 0 24px', textAlign: 'center', color: '#f4efe6', zIndex: 10 }}>
          Constellation is an interactive night sky. Please enable JavaScript to light your first star.
        </p>
      </noscript>
    </>
  );
}
