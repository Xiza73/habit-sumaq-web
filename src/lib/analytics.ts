import posthog from 'posthog-js';

/**
 * Type-safe wrapper around Posthog's `capture`. Adding events here is
 * mandatory — keeps the taxonomy in one place and surfaces typos at compile
 * time.
 *
 * Posthog is initialized in `<PostHogProvider>`. If `NEXT_PUBLIC_POSTHOG_KEY`
 * is unset (e.g. local dev without analytics, tests, CI builds without
 * secrets), `posthog.capture` is a silent no-op — posthog-js queues calls
 * before init and discards them when no init ever happens.
 *
 * Full event taxonomy lives in
 * `docs/business/growth-roadmap.md#eventos-a-trackear`.
 */
export const analytics = {
  // ─── Auth & onboarding ──────────────────────────────────────────────

  /**
   * The backend currently returns the same payload for first-time and
   * returning Google OAuth callbacks, so we only emit `login_completed`
   * today. When the backend exposes an `isNewUser` flag (or the response
   * differentiates), wire `signupCompleted` here too.
   */
  loginCompleted: (method: 'google') => {
    posthog.capture('login_completed', { method });
  },

  /** Reserved for when the backend differentiates first-time signups. */
  signupCompleted: (method: 'google') => {
    posthog.capture('signup_completed', { method });
  },

  // ─── Engagement (recurring) ─────────────────────────────────────────

  transactionCreated: (type: 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'DEBT' | 'LOAN') => {
    posthog.capture('transaction_created', { type });
  },

  habitLogged: () => {
    posthog.capture('habit_logged');
  },

  reportViewed: (type: 'finances' | 'routines') => {
    posthog.capture('report_viewed', { type });
  },

  // ─── User identification ────────────────────────────────────────────

  /**
   * Associates the current Posthog session with a stable user id so
   * cross-device events stitch together. Call after a successful auth
   * callback. Traits are optional and persist across sessions.
   */
  identify: (userId: string, traits?: Record<string, unknown>) => {
    posthog.identify(userId, traits);
  },

  /** Clears the identified user. Call on logout so the next login isn't
   * conflated with the previous user's session. */
  reset: () => {
    posthog.reset();
  },
};
