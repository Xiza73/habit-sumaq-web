import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for habits e2e suite.
 *
 * Auth is done via backend endpoint `POST /auth/test-login` (see the
 * `authenticated-page` fixture) — no real Google OAuth in e2e. Requires
 * the backend running locally with `TEST_AUTH_ENABLED=true` and
 * `TEST_AUTH_SECRET` matching the one exported here.
 *
 * Local bootstrap:
 *   # terminal 1 (backend)
 *   TEST_AUTH_ENABLED=true TEST_AUTH_SECRET=<32+chars> pnpm start:dev
 *   # terminal 2 (frontend)
 *   TEST_AUTH_SECRET=<same> pnpm test:e2e
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Frontend dev server — CI starts it explicitly via a job step instead.
  webServer: process.env.CI
    ? undefined
    : {
        command: 'pnpm dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
