const ABSOLUTE_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

/**
 * In the BROWSER we talk to the SAME origin — a Next.js rewrite (see
 * next.config.ts) proxies the API path to the backend. This keeps the auth
 * cookies FIRST-PARTY, which the macOS desktop webview (WKWebView, strict ITP)
 * requires: a cross-site refresh cookie gets silently blocked there and the
 * session dies every ~15 min. On the SERVER (SSR) a relative URL can't be
 * fetched, so we keep the absolute backend URL. Falls back to the absolute URL
 * if `NEXT_PUBLIC_API_URL` isn't a parseable absolute URL.
 */
function resolveApiUrl(): string {
  if (typeof window === 'undefined') return ABSOLUTE_API_URL;
  try {
    return new URL(ABSOLUTE_API_URL).pathname.replace(/\/+$/, '') || '/api';
  } catch {
    return ABSOLUTE_API_URL;
  }
}

export const env = {
  API_URL: resolveApiUrl(),
  APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001',
  POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '',
  POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
  /**
   * Opt-in switch to send Posthog events from a development build. Default is
   * OFF — local `pnpm dev` sessions don't pollute prod analytics with test
   * events. Flip to `'true'` in `.env.local` when you specifically want to
   * validate events end-to-end against Posthog from dev.
   */
  POSTHOG_ENABLE_IN_DEV: process.env.NEXT_PUBLIC_POSTHOG_ENABLE_IN_DEV === 'true',
} as const;
