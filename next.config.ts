import createNextIntlPlugin from 'next-intl/plugin';

import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Proxy the API through this same origin so the browser talks to the frontend
// domain and the backend auth cookies stay FIRST-PARTY. Without this the refresh
// cookie is cross-site (frontend on Vercel, API on Railway) and the macOS
// desktop webview (WKWebView / ITP) blocks it, killing the session every ~15min.
// The destination is the absolute backend URL from NEXT_PUBLIC_API_URL; the
// source is that URL's path (e.g. `/api/v1`), which the browser client uses.
function apiRewrites(): { source: string; destination: string }[] {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return [];
  let base: string;
  try {
    base = new URL(api).pathname.replace(/\/+$/, '');
  } catch {
    return [];
  }
  if (!base) return [];
  return [{ source: `${base}/:path*`, destination: `${api.replace(/\/+$/, '')}/:path*` }];
}

const nextConfig: NextConfig = {
  rewrites() {
    return Promise.resolve(apiRewrites());
  },

  // Next's `headers()` is typed as `() => Promise<...>` — we don't have any
  // async work to do here so we return a resolved Promise directly instead
  // of marking the method `async` (which triggers `require-await`).
  headers() {
    return Promise.resolve([
      {
        // Digital Asset Links file — Android reads it off the user's domain to
        // verify the TWA APK is allowed to render the site without the Chrome
        // URL bar. The APK is signed with the keystore whose SHA-256
        // fingerprint is listed in the file; rotating that keystore means
        // updating BOTH the keystore-side signing AND this file's hash.
        source: '/.well-known/assetlinks.json',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          // Short cache so a keystore rotation propagates quickly without
          // users having to wait out a long CDN TTL. Android re-verifies on
          // install + every ~24h; this aligns the CDN with that cadence.
          { key: 'Cache-Control', value: 'public, max-age=300, must-revalidate' },
        ],
      },
    ]);
  },
};

export default withNextIntl(nextConfig);
