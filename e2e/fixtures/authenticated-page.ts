import { type APIRequestContext, expect, type Page, test as base } from '@playwright/test';

const API_BASE_URL = process.env.E2E_API_URL ?? 'http://localhost:3010';
const FRONTEND_COOKIE_DOMAIN = 'localhost';

interface AuthSession {
  /** Browser page with the refresh_token cookie already set. */
  page: Page;
  /** Authenticated API client (Bearer access token). Use for seeding/cleanup. */
  api: APIRequestContext;
  /** Email used for this test's test-login (unique per testId). */
  email: string;
}

interface Fixtures {
  auth: AuthSession;
}

export const test = base.extend<Fixtures>({
  auth: async ({ browser, playwright }, use, testInfo) => {
    const secret = process.env.TEST_AUTH_SECRET;
    if (!secret) {
      throw new Error(
        'E2E cannot run: set TEST_AUTH_SECRET to the same value used by the backend (>= 32 chars, TEST_AUTH_ENABLED=true).',
      );
    }

    // 1. Call POST /auth/test-login with the shared secret header.
    const setupCtx = await playwright.request.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: { 'x-test-auth-secret': secret },
    });
    const email = `e2e+${testInfo.testId}@habit-sumaq.test`;
    const res = await setupCtx.post('/api/v1/auth/test-login', { data: { email } });
    expect(res.ok(), 'test-login failed — backend flags or secret mismatch').toBeTruthy();
    const payload = (await res.json()) as { data: { accessToken: string } };
    const accessToken = payload.data.accessToken;

    // Extract refresh_token cookie from Set-Cookie header (HttpOnly, so no other way).
    const setCookie = res.headers()['set-cookie'] ?? '';
    const match = /refresh_token=([^;]+)/.exec(setCookie);
    const refreshToken = match?.[1] ?? '';
    expect(refreshToken.length, 'refresh_token cookie not returned by test-login').toBeGreaterThan(
      0,
    );
    await setupCtx.dispose();

    // 2. Authenticated API client for seeding and cleanup inside tests.
    const api = await playwright.request.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: { Authorization: `Bearer ${accessToken}` },
    });

    // 3. Browser context with the refresh cookie + Spanish locale.
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'refresh_token',
        value: refreshToken,
        domain: FRONTEND_COOKIE_DOMAIN,
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
      {
        name: 'NEXT_LOCALE',
        value: 'es',
        domain: FRONTEND_COOKIE_DOMAIN,
        path: '/',
      },
    ]);
    const page = await context.newPage();

    await use({ page, api, email });

    await api.dispose();
    await context.close();
  },
});

export { expect } from '@playwright/test';
