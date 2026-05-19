import { type AlertsListResponse } from '@/core/domain/entities/alert';

import { httpClient } from './http-client';

/**
 * In-app alerts. The `X-Timezone` header is injected globally by the
 * `httpClient`, so the backend resolves "today / this period / midday" in
 * the user's local time without any extra wiring here.
 */
export const alertsApi = {
  /** List active alerts + `lastSeenAt`. Backend filters per-day dismissals + applies the midday gate. */
  getAll(): Promise<AlertsListResponse> {
    return httpClient.get<AlertsListResponse>('/alerts');
  },

  /**
   * Close a per-day alert until midnight in the user's TZ. Fails with
   * `409 ALR_001` for persistent alerts or unknown ID prefixes — the
   * caller should hide the close button for `!isDismissable` to avoid
   * round-trip 409s, but the server is the source of truth.
   */
  dismiss(alertId: string): Promise<void> {
    // Encode the ID — it contains `:` separators and could theoretically
    // include any character the backend chose for synthetic IDs.
    return httpClient.post<void>(`/alerts/${encodeURIComponent(alertId)}/dismiss`);
  },

  /**
   * Bump `lastAlertsSeenAt = now()` server-side. Drives the bell badge
   * back to zero. Backend does NOT touch `user_settings.updatedAt` here
   * so the `useUserSettings` cache survives the bump — only the next
   * `GET /alerts` returns the new `lastSeenAt`.
   */
  markSeen(): Promise<void> {
    return httpClient.post<void>('/alerts/mark-seen');
  },
};
