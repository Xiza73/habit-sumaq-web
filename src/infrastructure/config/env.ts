export const env = {
  API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000',
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
