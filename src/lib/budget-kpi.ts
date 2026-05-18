import { type BudgetWithKpi } from '@/core/domain/entities/budget';

/**
 * Derived KPI numbers that drive the "locked-day allowance" UX on the
 * budget dashboard. The backend already ships `amount / spent / remaining /
 * dailyAllowance / daysRemainingIncludingToday`, but those collapse the
 * "today vs rest of month" distinction into one number — making the
 * `dailyAllowance` flicker on every single movement.
 *
 * This helper splits them apart: today's allowance is **frozen at
 * start-of-day** based on `(amount - spentBeforeToday) / D`, and only
 * recomputes when the calendar day advances. Spending today reduces
 * `availableToday` without re-spreading anything across future days.
 *
 * Locale-agnostic and side-effect free — all math is derived from
 * `budget.movements` (already part of the list response) plus
 * `budget.currentDate` (the user's "today" in their TZ, stamped by the
 * backend). No clock reads here.
 */
export interface BudgetSpendBreakdown {
  /** Sum of movements dated today (`tx.date.slice(0,10) === budget.currentDate`). */
  spentToday: number;
  /** Sum of movements dated strictly before today. Excludes future-dated ones. */
  spentBeforeToday: number;
  /**
   * Sum of movements dated strictly after today. Almost always 0 because the
   * usual flow doesn't pre-date movements — kept here so the math doesn't
   * silently misclassify the edge case.
   */
  spentAfterToday: number;
  /**
   * Budget remaining at the START of today: `amount - spentBeforeToday`.
   * The denominator for the locked daily allowance.
   */
  remainingAtStartOfToday: number;
  /**
   * Locked daily allowance for today: `remainingAtStartOfToday / D`.
   * Constant for the whole calendar day in the user's TZ. Also the planned
   * per-day spend for the rest of the month (`A` for tomorrow, day-after, …).
   *
   * `null` when there are no days left (closed month) — the concept of a
   * "daily allowance" doesn't apply anymore.
   */
  lockedDailyAllowance: number | null;
  /**
   * How much the user can still spend today without breaking the plan:
   * `lockedDailyAllowance - spentToday`. Negative when over today's quota
   * — the future plan stays put (the recompute happens at midnight, not
   * mid-day). Null when month closed.
   */
  availableToday: number | null;
  /**
   * What's planned for tomorrow-onwards in aggregate:
   * `remainingAtStartOfToday - lockedDailyAllowance`. Doesn't change when
   * the user spends today — that's the whole point. Null when month closed.
   */
  remainingAfterToday: number | null;
}

/**
 * Cumulative-history metrics for the budget. Used by the "Tu mes hasta
 * ahora" section of the dashboard breakdown to give the user a sense of
 * "am I trending under or over my original plan?".
 */
export interface BudgetMonthHistory {
  /**
   * Calendar days completed BEFORE today within the budget's month.
   * - Current-month budget: `today.day - 1` (so May 18 → 17).
   * - Closed (past) month: full month length.
   * - Future month: 0.
   *
   * Today is excluded so the average isn't skewed by a partial day.
   */
  daysElapsedBeforeToday: number;
  /**
   * Average daily spend over `daysElapsedBeforeToday` days, using
   * `spentBeforeToday` as the numerator. Null when no complete days exist
   * yet (first day of the month, or a future-month budget) — caller hides
   * the metric instead of rendering `S/ NaN`.
   */
  averageDailySpendBeforeToday: number | null;
  /**
   * Original "spend everything evenly" daily target: `amount / totalDaysInMonth`.
   * The reference line in the bar chart, also shown numerically for context.
   */
  originalDailyTarget: number;
  /**
   * Signed difference between original target and actual average:
   * `originalDailyTarget - averageDailySpendBeforeToday`.
   *
   * - Positive → under plan (user is saving).
   * - Negative → over plan.
   * - Null mirrors `averageDailySpendBeforeToday`.
   */
  diffVsOriginal: number | null;
}

/** A single bar in the per-day spend history chart. */
export interface DailySpend {
  /** `YYYY-MM-DD` in the user's timezone (same shape as `budget.currentDate`). */
  date: string;
  /** Sum of movements dated this day. 0 when nothing was spent. */
  spent: number;
}

/**
 * Compute the locked-day breakdown from a budget snapshot.
 *
 * See {@link BudgetSpendBreakdown} for what each field means and the
 * rationale. The function is pure — it derives everything from
 * `budget.movements` + `budget.currentDate` + `budget.daysRemainingIncludingToday`,
 * none of which read the wall clock.
 */
export function getBudgetSpendBreakdown(budget: BudgetWithKpi): BudgetSpendBreakdown {
  const today = budget.currentDate;
  let spentBeforeToday = 0;
  let spentToday = 0;
  let spentAfterToday = 0;

  budget.movements.forEach((tx) => {
    const txDate = tx.date.slice(0, 10);
    if (txDate < today) spentBeforeToday += tx.amount;
    else if (txDate === today) spentToday += tx.amount;
    else spentAfterToday += tx.amount;
  });

  const remainingAtStartOfToday = budget.amount - spentBeforeToday;

  if (budget.daysRemainingIncludingToday <= 0) {
    // Closed month — daily allowance has no meaning. Caller renders dashes.
    return {
      spentToday,
      spentBeforeToday,
      spentAfterToday,
      remainingAtStartOfToday,
      lockedDailyAllowance: null,
      availableToday: null,
      remainingAfterToday: null,
    };
  }

  const lockedDailyAllowance = remainingAtStartOfToday / budget.daysRemainingIncludingToday;
  const availableToday = lockedDailyAllowance - spentToday;
  const remainingAfterToday = remainingAtStartOfToday - lockedDailyAllowance;

  return {
    spentToday,
    spentBeforeToday,
    spentAfterToday,
    remainingAtStartOfToday,
    lockedDailyAllowance,
    availableToday,
    remainingAfterToday,
  };
}

/** Last calendar day of the given (year, month). `month` is 1-indexed. */
function lastDayOfMonth(year: number, month: number): number {
  // `new Date(Y, M, 0)` returns the last day of month `M` (where `M` is
  // 1-indexed-as-month+1: day 0 of next month = last day of this).
  return new Date(year, month, 0).getDate();
}

/**
 * Compute the cumulative-history metrics for the budget. Driven by
 * `budget.currentDate` to figure out whether the budget belongs to the
 * current, past, or future calendar month — the meaning of "days elapsed"
 * is different in each case.
 *
 * See {@link BudgetMonthHistory} for the per-field semantics.
 */
export function getBudgetMonthHistory(budget: BudgetWithKpi): BudgetMonthHistory {
  const totalDays = lastDayOfMonth(budget.year, budget.month);
  const originalDailyTarget = budget.amount / totalDays;

  const [todayYearStr, todayMonthStr, todayDayStr] = budget.currentDate.split('-');
  const todayYear = Number(todayYearStr);
  const todayMonth = Number(todayMonthStr);
  const todayDay = Number(todayDayStr);

  let daysElapsedBeforeToday: number;
  if (todayYear === budget.year && todayMonth === budget.month) {
    daysElapsedBeforeToday = todayDay - 1;
  } else {
    const isPastBudget =
      todayYear > budget.year || (todayYear === budget.year && todayMonth > budget.month);
    daysElapsedBeforeToday = isPastBudget ? totalDays : 0;
  }

  const breakdown = getBudgetSpendBreakdown(budget);
  const averageDailySpendBeforeToday =
    daysElapsedBeforeToday > 0 ? breakdown.spentBeforeToday / daysElapsedBeforeToday : null;
  const diffVsOriginal =
    averageDailySpendBeforeToday === null
      ? null
      : originalDailyTarget - averageDailySpendBeforeToday;

  return {
    daysElapsedBeforeToday,
    averageDailySpendBeforeToday,
    originalDailyTarget,
    diffVsOriginal,
  };
}

/**
 * Per-day spend in a window ending at `budget.currentDate`. The window is
 * trimmed to the budget's calendar month — if the window starts before the
 * 1st, those days are dropped (the budget has no movements there by
 * construction). Result is sorted oldest-first so the caller can render
 * top-to-bottom rows.
 *
 * @param daysWindow Length of the window (default 7).
 */
export function getDailySpendHistory(budget: BudgetWithKpi, daysWindow = 7): DailySpend[] {
  const [todayYearStr, todayMonthStr, todayDayStr] = budget.currentDate.split('-');
  const todayYear = Number(todayYearStr);
  const todayMonth = Number(todayMonthStr);
  const todayDay = Number(todayDayStr);

  // Build a lookup so we don't loop through movements `daysWindow` times.
  const spendByDate = new Map<string, number>();
  budget.movements.forEach((tx) => {
    const txDate = tx.date.slice(0, 10);
    spendByDate.set(txDate, (spendByDate.get(txDate) ?? 0) + tx.amount);
  });

  const result: DailySpend[] = [];
  for (let i = daysWindow - 1; i >= 0; i--) {
    // Use `Date.UTC` to walk back in calendar days without DST surprises —
    // the math is "today minus i days" in a Gregorian sense, no clock reads.
    const d = new Date(Date.UTC(todayYear, todayMonth - 1, todayDay - i));
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    const day = d.getUTCDate();

    // Drop days outside the budget's month. The budget has no movements
    // there, and rendering empty bars for irrelevant days would mislead.
    if (year !== budget.year || month !== budget.month) continue;

    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    result.push({ date: dateStr, spent: spendByDate.get(dateStr) ?? 0 });
  }

  return result;
}
