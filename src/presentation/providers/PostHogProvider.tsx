'use client';

import { useEffect } from 'react';

import posthog from 'posthog-js';

import { env } from '@/infrastructure/config/env';

/**
 * Initializes the Posthog client once on mount. If `NEXT_PUBLIC_POSTHOG_KEY`
 * is not set (e.g. local dev without analytics, CI builds, tests), we skip
 * init entirely — every subsequent `analytics.*` call becomes a silent no-op.
 *
 * `person_profiles: 'identified_only'` is the GDPR-friendly default: anonymous
 * users don't get a profile until we explicitly call `analytics.identify()`
 * after a successful login. Reduces noise in the dashboard and keeps
 * compliance simple.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!env.POSTHOG_KEY) return;
    if (posthog.__loaded) return;

    posthog.init(env.POSTHOG_KEY, {
      api_host: env.POSTHOG_HOST,
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      // Defer the first request a tick after mount so it doesn't fight with
      // the initial page render on slow networks.
      loaded: (ph) => {
        if (process.env.NODE_ENV === 'development') {
          ph.debug();
        }
      },
    });
  }, []);

  return <>{children}</>;
}
