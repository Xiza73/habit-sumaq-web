import { type Currency } from '@/core/domain/enums/account.enums';

export interface MonthlyService {
  id: string;
  userId: string;
  name: string;
  defaultAccountId: string;
  categoryId: string;
  currency: Currency;
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
