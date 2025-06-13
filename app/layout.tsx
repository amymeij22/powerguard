import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PowerGuard - Monitoring System',
  description: 'Sistem Monitoring untuk Pemantauan Listrik dan Genset BBMKG I Medan',
  robots: 'noindex, nofollow',
  applicationName: 'PowerGuard',
  authors: [{ name: 'BBMKG I Medan' }],
  viewport: 'width=device-width, initial-scale=1',
  generator: 'Next.js',
  themeColor: '#ffffff',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <meta name="googlebot" content="noindex, nofollow" />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot-news" content="noindex, nofollow" />
        <meta name="bingbot" content="noindex, nofollow" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.className} light always-glow`}>
        {children}
      </body>
    </html>
  );
}