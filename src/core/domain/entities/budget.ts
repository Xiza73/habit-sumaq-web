import { type BudgetMovement } from '@/core/domain/entities/budget-movement';
import { type Currency } from '@/core/domain/enums/currency.enum';

/**
 * Monthly discretionary spending plan, scoped to one (year, month, currency).
 *
 * v1.0.0 (`accounts-to-modular-finance` refactor): "movements" are now rows
 * in the dedicated `budget_movements` table (see `BudgetMovement`), not the
 * legacy `transactions` rows tagged with `budgetId`. This is still NOT a
 * tracker that reads every expense of the month — only the ones the user
 * explicitly logs against the budget count toward `spent`.
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
 *
 * The web ALSO fetches movements separately via `useBudgetMovements(budget.id)`
 * — that's the canonical surface since A6-W.1. The `movements` field here
 * stays for backwards-compat with the legacy API shape but no consumer reads
 * it. A6-B will drop it from the response entirely.
 */
export interface BudgetRecoveryPlan {
  /** Whole days spending nothing. */
  zeroSpendDays: number;
  /** Whole days spending half the opening allowance — always 2x the above. */
  halfSpendDays: number;
  /**
   * False when even spending nothing for the rest of the month falls short.
   * Render "no recuperable este mes" rather than a count the user cannot act
   * on — `zeroSpendDays` can meet or exceed the days that are actually left.
   */
  recoverable: boolean;
}

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
  /**
   * `amount / daysInMonth` — the allowance the month opened with, and the bar
   * `recovery` aims at. Null when the budget's month is closed.
   */
  initialDailyAllowance: number | null;
  /**
   * How many days of restraint bring `dailyAllowance` back up to
   * `initialDailyAllowance`. Null when the month is closed — there is nothing
   * left to recover into.
   */
  recovery: BudgetRecoveryPlan | null;
  /** `YYYY-MM-DD` — today's date in the client timezone. */
  currentDate: string;
  movements: BudgetMovement[];
}
