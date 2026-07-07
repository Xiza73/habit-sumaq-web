import createNextIntlPlugin from 'next-intl/plugin';

import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
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
