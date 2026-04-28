import { type Currency } from '@/core/domain/enums/account.enums';

/**
 * Allowed billing cadences for a MonthlyService. The backend stores these as
 * raw integers with a DB CHECK constraint — keep them in sync if the column
 * ever expands.
 */
export const MONTHLY_SERVICE_FREQUENCIES = [1, 3, 6, 12] as const;
export type MonthlyServiceFrequencyValue = (typeof MONTHLY_SERVICE_FREQUENCIES)[number];

/**
 * i18n keys (without the `monthlyServices.frequency.` prefix) that the UI uses
 * to label each cadence in selects, badges, and group headers.
 */
export const MONTHLY_SERVICE_FREQUENCY_LABEL_KEYS: Record<MonthlyServiceFrequencyValue, string> = {
  1: 'monthly',
  3: 'quarterly',
  6: 'semiannual',
  12: 'annual',
};

export interface MonthlyService {
  id: string;
  userId: string;
  name: string;
  defaultAccountId: string;
  categoryId: string;
  currency: Currency;
  /**
   * Billing cadence in months. Backend restricts to {1, 3, 6, 12} via CHECK
   * constraint. Default is 1 (mensual). Immutable after creation — the form
   * only shows the select when creating, disabled while editing.
   */
  frequencyMonths: MonthlyServiceFrequencyValue;
  estimatedAmount: number | null;
  dueDay: number | null;
  /** 'YYYY-MM' — first period this service is billed for. */
  startPeriod: string;
  /** 'YYYY-MM' of the last period the user marked as paid/skipped. Null before any pay/skip. */
  lastPaidPeriod: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Backend-computed derivatives (always present in list/detail responses):
  /** 'YYYY-MM' of the next period that needs action. Computed in the user timezone. */
  nextDuePeriod: string;
  /** True when `nextDuePeriod` is earlier than the user's current month. */
  isOverdue: boolean;
  /** True when `lastPaidPeriod === currentMonth` in the user timezone. */
  isPaidForCurrentMonth: boolean;
}
