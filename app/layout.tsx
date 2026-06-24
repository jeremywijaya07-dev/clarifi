import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://clarifi.vercel.app');

const description =
  'Riset & analisis saham US dan IDX bertenaga AI — fair value, indikator teknikal, dan data near real-time dalam satu tempat.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Clarifi — Clarity in every trade',
  description,
  openGraph: {
    title: 'Clarifi — Clarity in every trade',
    description,
    url: siteUrl,
    siteName: 'Clarifi',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Clarifi — Clarity in every trade' }],
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Clarifi — Clarity in every trade',
    description,
    images: ['/opengraph-image'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const t = localStorage.getItem('theme');
                if (t === 'light') { document.documentElement.classList.remove('dark'); }
                else { document.documentElement.classList.add('dark'); }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className="flex flex-col min-h-screen">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
