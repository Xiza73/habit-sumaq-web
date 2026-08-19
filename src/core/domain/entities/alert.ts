/**
 * In-app pseudo-notification surfaced by `GET /alerts`. Computed on every
 * request from the backend's monthly-services, habits, budgets and chores
 * modules — there is NO alerts table. Two dismiss policies:
 *
 *   - `per-day`  → user can close it; reappears at midnight in their TZ
 *   - `persistent` → can only be cleared by resolving the underlying condition
 *
 * The contract lives canonically in
 * `habit-sumaq-backend/docs/frontend/api-reference.md#alerts`.
 */

export const ALERT_TYPES = [
  'service-due-today',
  'service-overdue',
  'habits-midday',
  'budget-unlogged',
  'chore-overdue',
  'chore-due-today',
  'reminder-due',
] as const;
export type AlertType = (typeof ALERT_TYPES)[number];

export const ALERT_SEVERITIES = ['info', 'warning'] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

/**
 * Discriminated payload per `AlertType`. The wire payload is loosely typed
 * (`Record<string, string | number | null>`) on purpose so adding a new key
 * server-side doesn't require an immediate frontend ship — readers narrow
 * by `alert.type` and access only the fields they expect.
 */
export interface AlertPayloads {
  'service-due-today': {
    serviceId: string;
    serviceName: string;
    /**
     * The user's approximate due day, or `null` when they never set one. In
     * the null case the backend opens the alert for the closing days of the
     * period instead, and there is no day to render.
     */
    dueDay: number | null;
    /**
     * Days left in the period INCLUDING today. Only set when `dueDay` is null
     * — with a due day the copy uses the day. Computed server-side: the user's
     * timezone lives there, so the client never derives "what day is it".
     */
    daysLeftInPeriod: number | null;
    currency: string;
    estimatedAmount: number | null;
  };
  'service-overdue': {
    serviceId: string;
    serviceName: string;
    overduePeriod: string; // 'YYYY-MM'
    currency: string;
    estimatedAmount: number | null;
  };
  'habits-midday': {
    missingCount: number;
    firstHabitName: string;
  };
  'budget-unlogged': {
    budgetId: string;
    currency: string;
    remaining: number; // > 0
    days: number; // consecutive no-movement days ending today, >= 2
  };
  'chore-overdue': {
    choreId: string;
    choreName: string;
    nextDueDate: string; // 'YYYY-MM-DD'
  };
  /** Same shape as `chore-overdue`; `nextDueDate` is today rather than past. */
  'chore-due-today': {
    choreId: string;
    choreName: string;
    nextDueDate: string; // 'YYYY-MM-DD', == today in the user TZ
  };
  /**
   * A dated, still-pending reminder whose moment has arrived. Undated
   * reminders never produce this alert, so `remindDate` is always set here
   * even though the entity allows null.
   */
  'reminder-due': {
    reminderId: string;
    title: string;
    remindDate: string; // 'YYYY-MM-DD', today or earlier
    remindTime: string | null; // 'HH:mm'
  };
}

export interface Alert {
  /** Stable string ID, e.g. `service-due-today:{uuid}:2026-05`. */
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  /**
   * True for per-day (`service-due-today`, `habits-midday`, `budget-unlogged`) — the UI shows
   * the close button only when this is true. Server enforces it too: a
   * dismiss against a persistent alert returns 409 `ALR_001`.
   */
  isDismissable: boolean;
  /** UTC ISO. Compared against `lastSeenAt` to drive the bell badge. */
  triggeredAt: string;
  payload: Record<string, string | number | null>;
}

export interface AlertsListResponse {
  alerts: Alert[];
  /** UTC ISO of the user's last `mark-seen`, or `null` if they never opened it. */
  lastSeenAt: string | null;
}

/**
 * Maps an alert to the in-app route the user lands on when they click the
 * item in the popover. Returns `null` when there's no useful destination
 * (the item then renders as non-clickable).
 *
 * Deep-linking (e.g. `/budgets/{id}`) is a future iteration — today we
 * land on the feature index page, which is the closest "thing to fix" the
 * user expects to act on.
 *
 * Note the asymmetry between API path and frontend route for services: the
 * backend exposes `/monthly-services` (matches `MonthlyServicesModule`),
 * but the Next.js route is `/services` (see `src/app/(dashboard)/services/`).
 * NAV_SECTIONS in Sidebar.tsx is the source of truth — keep this mapping
 * in sync with that file.
 */
export function getAlertHref(alert: Alert): string | null {
  switch (alert.type) {
    case 'service-due-today':
    case 'service-overdue':
      return '/services';
    case 'habits-midday':
      return '/habits';
    case 'budget-unlogged':
      return '/budgets';
    case 'chore-overdue':
    case 'chore-due-today':
      return '/chores';
    case 'reminder-due':
      return '/reminders';
    default:
      return null;
  }
}
