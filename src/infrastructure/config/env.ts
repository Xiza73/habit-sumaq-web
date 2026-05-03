export const env = {
  API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000',
  APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001',
  POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '',
  POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
} as const;
