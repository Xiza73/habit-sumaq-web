import { Geist, Geist_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

import { Providers } from '@/presentation/providers/Providers';

import type { Metadata, Viewport } from 'next';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'Habit Sumaq',
    template: '%s | Habit Sumaq',
  },
  description: 'Empieza hoy un buen hábito — Finanzas personales y hábitos',
  manifest: '/manifest.json',
  icons: {
    // Modern browsers prefer the SVG (sharp at any size). The PNG fallbacks
    // are bitmaps generated from the same SVG and live in /public/icons/ —
    // referenced explicitly so iOS Safari and older Android Chrome pick the
    // right artwork instead of falling back to a default.
    icon: [
      { url: '/logo/logo_lg.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/icons/icon-192.png',
    // iOS uses apple-touch-icon at 180x180 for the home-screen webclip. The
    // bitmap is rendered from logo_lg.svg with a white background so the
    // brand reads well over any wallpaper.
    apple: { url: '/icons/icon-apple-180.png', sizes: '180x180', type: 'image/png' },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Habit Sumaq',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
