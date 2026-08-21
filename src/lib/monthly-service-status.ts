import { type MonthlyService } from '@/core/domain/entities/monthly-service';

/**
 * Monthly-service status derivation — the single source of truth shared by
 * `MonthlyServiceCard` and `MonthlyServicesTable` so both the cards and the
 * table view resolve the status tone, its color classes, and the "can pay"
 * rule identically.
 */

export type MonthlyServiceStatusTone = 'paid' | 'today' | 'pastDueDay' | 'pending' | 'overdue';

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
 * The due window carries **two** states, split on which side of the reference
 * date we are:
 *
 *   today === dueDay   → `today`
 *   today  >  dueDay   → `pastDueDay`
 *
 * `today` used to run from the due day onward, which kept the service
 * actionable all month — right — but labelled the 28th "toca hoy" because the
 * reference date was the 15th, which is false. Both remain actionable; they
 * just stop claiming to be the same day.
 *
 * Neither is `overdue`, which means the whole period elapsed. This is the
 * state between "the date you wrote down is today" and "the month went by".
 *
 * (Chores keep exact equality with no past-day state — their `nextDueDate` is
 * a computed exact date that rolls forward on completion, so there is nothing
 * to be "past" within a period.)
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
  // `dueDay` is nullable — without one there is no anchor to count from, and
  // the service simply stays pending for the whole period.
  if (service.dueDay != null && dayOfMonth === service.dueDay) return 'today';
  if (service.dueDay != null && dayOfMonth > service.dueDay) return 'pastDueDay';
  return 'pending';
}

export const MONTHLY_SERVICE_STATUS_CLASSES: Record<MonthlyServiceStatusTone, string> = {
  paid: 'bg-income/15 text-income',
  // Same tone chores gives its own `today`: louder than pending's amber, but
  // not the red reserved for "you already missed this".
  today: 'bg-primary/15 text-primary',
  // Between today's primary and overdue's red: the reference date went by,
  // but the month has not.
  pastDueDay: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  overdue: 'bg-destructive/15 text-destructive',
};

/**
 * The chip's translated label for a tone.
 *
 * Lives here beside the tone and its classes because the card and the table
 * previously each carried their own hardcoded three-way conditional. Adding
 * `today` to the resolver left both of them silently falling through to the
 * overdue branch — a state can no longer be half-added.
 *
 * Only `overdue` interpolates the period; every other tone is deliberately
 * short, since the summary header already shows the current month.
 */
export function monthlyServiceStatusLabel(
  status: MonthlyServiceStatusTone,
  t: (key: string, values?: Record<string, string>) => string,
  periodLabel: string,
): string {
  if (status === 'overdue') return t('status.overdue', { period: periodLabel });
  return t(`status.${status}`);
}

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
