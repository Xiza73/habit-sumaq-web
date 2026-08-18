import { type MonthlyService } from '@/core/domain/entities/monthly-service';

/**
 * Monthly-service status derivation — the single source of truth shared by
 * `MonthlyServiceCard` and `MonthlyServicesTable` so both the cards and the
 * table view resolve the status tone, its color classes, and the "can pay"
 * rule identically.
 */

export type MonthlyServiceStatusTone = 'paid' | 'today' | 'pending' | 'overdue';

/**
 * Resolve the badge tone for a service.
 *
 * Order matters and encodes a priority: **overdue beats today beats paid beats
 * pending**. A service overdue from an earlier period whose due day happens to
 * fall today is still overdue — the older signal is the more urgent one.
 *
 * `today` was missing entirely, so a service due today looked identical to one
 * due in three weeks: both read "Pendiente". Chores already made that
 * distinction, and the two modules disagreeing about what a due-today item
 * looks like is the kind of inconsistency users notice without being able to
 * name it.
 *
 * `dayOfMonth` is injectable so the derivation stays testable; it defaults to
 * the real current day, which keeps every existing call site unchanged.
 */
export function resolveMonthlyServiceStatus(
  service: Pick<MonthlyService, 'isOverdue' | 'isPaidForCurrentMonth'> & {
    dueDay?: number | null;
  },
  dayOfMonth: number = new Date().getDate(),
): MonthlyServiceStatusTone {
  if (service.isOverdue) return 'overdue';
  if (service.isPaidForCurrentMonth) return 'paid';
  // `dueDay` is nullable — without one there is no "today" to speak of, and
  // the service simply stays pending for the whole period.
  if (service.dueDay != null && service.dueDay === dayOfMonth) return 'today';
  return 'pending';
}

export const MONTHLY_SERVICE_STATUS_CLASSES: Record<MonthlyServiceStatusTone, string> = {
  paid: 'bg-income/15 text-income',
  // Same tone chores gives its own `today`: louder than pending's amber, but
  // not the red reserved for "you already missed this".
  today: 'bg-primary/15 text-primary',
  pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  overdue: 'bg-destructive/15 text-destructive',
};

/**
 * Whether the "Pagar" / "Saltear" actions should be offered.
 *
 * Hide both actions when the service is already up-to-date for the current
 * month — allowing "Pagar" here would create a second transaction and skip
 * a future month silently (bug reported by user).
 */
export function canPayMonthlyService(
  service: Pick<MonthlyService, 'isActive' | 'isOverdue' | 'isPaidForCurrentMonth'>,
): boolean {
  const isArchived = !service.isActive;
  return !isArchived && resolveMonthlyServiceStatus(service) !== 'paid';
}
