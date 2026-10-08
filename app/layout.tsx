import type { Metadata } from 'next';
import '@fontsource/cormorant-garamond/latin-300.css';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-300-italic.css';
import '@fontsource/cormorant-garamond/latin-400-italic.css';
import '@fontsource/dm-sans/latin-300.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import './globals.css';
import SmoothScroll from '../components/SmoothScroll';
import { Analytics } from '@vercel/analytics/next';


export const metadata: Metadata = {
  title: 'Everwell — Online therapy in Thailand',
  description: 'Warm, confidential online therapy with qualified psychologists in Thailand for adults, teens, couples and families.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><SmoothScroll />{children}<Analytics /></body>
    </html>
  );
}
