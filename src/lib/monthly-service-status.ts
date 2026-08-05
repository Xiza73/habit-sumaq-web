import { type MonthlyService } from '@/core/domain/entities/monthly-service';

/**
 * Monthly-service status derivation — the single source of truth shared by
 * `MonthlyServiceCard` and `MonthlyServicesTable` so both the cards and the
 * table view resolve the status tone, its color classes, and the "can pay"
 * rule identically.
 */

export type MonthlyServiceStatusTone = 'paid' | 'pending' | 'overdue';

export function resolveMonthlyServiceStatus(
  service: Pick<MonthlyService, 'isOverdue' | 'isPaidForCurrentMonth'>,
): MonthlyServiceStatusTone {
  if (service.isOverdue) return 'overdue';
  if (service.isPaidForCurrentMonth) return 'paid';
  return 'pending';
}

export const MONTHLY_SERVICE_STATUS_CLASSES: Record<MonthlyServiceStatusTone, string> = {
  paid: 'bg-income/15 text-income',
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
