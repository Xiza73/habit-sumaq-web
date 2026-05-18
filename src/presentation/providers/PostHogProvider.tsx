'use client';

import { useEffect } from 'react';

import posthog from 'posthog-js';

import { env } from '@/infrastructure/config/env';

/**
 * Initializes the Posthog client once on mount. Init is skipped — and every
 * subsequent `analytics.*` call becomes a silent no-op — when ANY of these
 * are true:
 *
 *   1. `NEXT_PUBLIC_POSTHOG_KEY` is unset (CI builds, anyone without the key).
 *   2. We're in `NODE_ENV !== 'production'` AND the explicit opt-in
 *      `NEXT_PUBLIC_POSTHOG_ENABLE_IN_DEV` is not `'true'`. This prevents
 *      local `pnpm dev` sessions from polluting prod analytics with test
 *      events + spamming the console.
 *
 * `person_profiles: 'identified_only'` is the GDPR-friendly default: anonymous
 * users don't get a profile until we explicitly call `analytics.identify()`
 * after a successful login. Reduces noise in the dashboard and keeps
 * compliance simple.
 *
 * **To debug Posthog from dev**: in `.env.local`, set
 * `NEXT_PUBLIC_POSTHOG_ENABLE_IN_DEV=true`. Once initialized, you can also
 * run `posthog.debug()` from the browser console to see every event +
 * network call live.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!env.POSTHOG_KEY) return;
    if (posthog.__loaded) return;

    // Production always initializes. Dev only if the opt-in flag is set.
    // Both paths gated on having a key (above) so a missing key still
    // short-circuits.
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction && !env.POSTHOG_ENABLE_IN_DEV) return;

    posthog.init(env.POSTHOG_KEY, {
      api_host: env.POSTHOG_HOST,
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
    });
  }, []);

  return <>{children}</>;
}
