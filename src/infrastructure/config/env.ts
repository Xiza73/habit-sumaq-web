export const env = {
  API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000',
  APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001',
} as const;
