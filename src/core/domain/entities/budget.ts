import { type Transaction } from '@/core/domain/entities/transaction';
import { type Currency } from '@/core/domain/enums/account.enums';

/**
 * Monthly discretionary spending plan, scoped to one (year, month, currency).
 *
 * Movements are EXPENSE transactions tagged with `budgetId`. This is NOT a
 * tracker that reads every expense of the month — only the ones the user
 * explicitly logs against the budget count toward `spent`. Lets the user
 * separate "money for free spending" from rent / services / etc.
 */
export interface Budget {
  id: string;
  userId: string;
  year: number;
  /** 1-12 */
  month: number;
  currency: Currency;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Budget detail view returned by `GET /budgets/current` and `GET /budgets/:id`.
 * Embeds KPI snapshot + movements so the dashboard renders in a single fetch.
 */
export interface BudgetWithKpi extends Budget {
  spent: number;
  remaining: number;
  /**
   * Days left in the budget's month including today (computed in client TZ).
   * 0 for past budgets — `dailyAllowance` is null in that case.
   * Full month length for future budgets.
   */
  daysRemainingIncludingToday: number;
  /**
   * `remaining / daysRemainingIncludingToday`, rounded to 2 decimals. Negative
   * when the user has overspent. Null when the budget's month is closed.
   */
  dailyAllowance: number | null;
  /** `YYYY-MM-DD` — today's date in the client timezone. */
  currentDate: string;
  movements: Transaction[];
}
