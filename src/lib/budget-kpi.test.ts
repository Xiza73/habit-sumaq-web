import { describe, expect, it } from 'vitest';

import { type BudgetWithKpi } from '@/core/domain/entities/budget';
import { type BudgetMovement } from '@/core/domain/entities/budget-movement';

import { getBudgetMonthHistory, getBudgetSpendBreakdown, getDailySpendHistory } from './budget-kpi';

function makeMovement(date: string, amount: number, id = `mv-${date}-${amount}`): BudgetMovement {
  return {
    id,
    userId: 'user-1',
    budgetId: 'b-1',
    currency: 'PEN',
    categoryId: 'cat-1',
    amount,
    description: null,
    date: `${date}T12:00:00.000Z`,
    createdAt: `${date}T12:00:00.000Z`,
    updatedAt: `${date}T12:00:00.000Z`,
  };
}

function makeBudget(overrides: Partial<BudgetWithKpi> = {}): BudgetWithKpi {
  const base: BudgetWithKpi = {
    id: 'b-1',
    userId: 'user-1',
    year: 2026,
    month: 5,
    currency: 'PEN',
    amount: 1000,
    spent: 0,
    remaining: 1000,
    daysRemainingIncludingToday: 14,
    dailyAllowance: 35.71,
    currentDate: '2026-05-18',
    movements: [],
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-18T00:00:00.000Z',
  };
  return { ...base, ...overrides };
}

describe('getBudgetSpendBreakdown', () => {
  it('returns zero spends and the full amount as start-of-day remaining when there are no movements', () => {
    const budget = makeBudget();
    const out = getBudgetSpendBreakdown(budget);

    expect(out.spentToday).toBe(0);
    expect(out.spentBeforeToday).toBe(0);
    expect(out.spentAfterToday).toBe(0);
    expect(out.remainingAtStartOfToday).toBe(1000);
    // 1000 / 14 = 71.4285…
    expect(out.lockedDailyAllowance).toBeCloseTo(71.4285714, 6);
    expect(out.availableToday).toBeCloseTo(71.4285714, 6);
    expect(out.remainingAfterToday).toBeCloseTo(1000 - 71.4285714, 6);
  });

  it('keeps the daily allowance FROZEN when the user spends today (the load-bearing invariant)', () => {
    // The whole point of the locked-day model. Spending today reduces
    // `availableToday` and `spentToday`, but `lockedDailyAllowance` and
    // `remainingAfterToday` MUST stay identical to the no-spend baseline —
    // those only recompute at midnight.
    const baseline = getBudgetSpendBreakdown(makeBudget());
    const afterSpend = getBudgetSpendBreakdown(
      makeBudget({
        spent: 20,
        remaining: 980,
        movements: [makeMovement('2026-05-18', 20)],
      }),
    );

    expect(afterSpend.spentToday).toBe(20);
    expect(afterSpend.availableToday).toBeCloseTo((baseline.availableToday ?? 0) - 20, 6);
    // The two MUST match the baseline — proving the future plan didn't shift.
    expect(afterSpend.lockedDailyAllowance).toBe(baseline.lockedDailyAllowance);
    expect(afterSpend.remainingAfterToday).toBe(baseline.remainingAfterToday);
  });

  it('uses past-day spend as the start-of-today baseline (re-spread already happened)', () => {
    // 3 days into the month with S/120 spent on past days. Start-of-today
    // remaining should be amount - spentBeforeToday, not amount - all-spend.
    const budget = makeBudget({
      currentDate: '2026-05-03',
      daysRemainingIncludingToday: 29,
      spent: 120,
      remaining: 880,
      movements: [makeMovement('2026-05-01', 50), makeMovement('2026-05-02', 70)],
    });
    const out = getBudgetSpendBreakdown(budget);
    expect(out.spentBeforeToday).toBe(120);
    expect(out.spentToday).toBe(0);
    expect(out.remainingAtStartOfToday).toBe(880);
    expect(out.lockedDailyAllowance).toBeCloseTo(880 / 29, 6);
  });

  it('handles overspend today (negative availableToday) without shrinking the future plan', () => {
    // User goes over today's quota. The plan for tomorrow onwards is
    // unchanged — recompute is deferred to the next day. Until then, the
    // user sees a negative `availableToday` as the signal.
    const budget = makeBudget({
      spent: 200,
      remaining: 800,
      movements: [makeMovement('2026-05-18', 200)],
    });
    const out = getBudgetSpendBreakdown(budget);
    const baseline = getBudgetSpendBreakdown(makeBudget());
    expect(out.spentToday).toBe(200);
    expect(out.availableToday).toBeLessThan(0);
    expect(out.lockedDailyAllowance).toBe(baseline.lockedDailyAllowance);
    expect(out.remainingAfterToday).toBe(baseline.remainingAfterToday);
  });

  it('returns null daily/available/remaining-after when the budget month is closed', () => {
    // Past-month budget: backend ships `daysRemainingIncludingToday=0`. The
    // daily concept doesn't apply — caller renders dashes.
    const budget = makeBudget({
      daysRemainingIncludingToday: 0,
      dailyAllowance: null,
      currentDate: '2026-06-15',
      spent: 850,
      remaining: 150,
      movements: [makeMovement('2026-05-30', 850)],
    });
    const out = getBudgetSpendBreakdown(budget);
    expect(out.lockedDailyAllowance).toBeNull();
    expect(out.availableToday).toBeNull();
    expect(out.remainingAfterToday).toBeNull();
    // But the day-bucket sums should still be sensible — caller may render them.
    expect(out.spentBeforeToday).toBe(850);
    expect(out.spentToday).toBe(0);
  });

  it('classifies future-dated movements separately (does not pollute spentBeforeToday)', () => {
    // Rare but possible: user logs a movement dated tomorrow. It contributes
    // to `budget.spent` (total) but not to any "elapsed" bucket — the
    // start-of-today remaining must NOT include it.
    const budget = makeBudget({
      spent: 80,
      remaining: 920,
      movements: [
        makeMovement('2026-05-17', 50), // before today
        makeMovement('2026-05-19', 30), // after today
      ],
    });
    const out = getBudgetSpendBreakdown(budget);
    expect(out.spentBeforeToday).toBe(50);
    expect(out.spentToday).toBe(0);
    expect(out.spentAfterToday).toBe(30);
    // remainingAtStartOfToday only subtracts past spend, not future-dated.
    expect(out.remainingAtStartOfToday).toBe(1000 - 50);
  });
});

describe('getBudgetMonthHistory', () => {
  it('reports days elapsed before today for the current-month budget', () => {
    // May 18 → 17 complete days before today (May 1 … May 17).
    const out = getBudgetMonthHistory(makeBudget());
    expect(out.daysElapsedBeforeToday).toBe(17);
  });

  it('reports full month length for a closed (past-month) budget', () => {
    // June currently, the budget is for May. All 31 days of May are elapsed.
    const out = getBudgetMonthHistory(
      makeBudget({
        currentDate: '2026-06-10',
        daysRemainingIncludingToday: 0,
      }),
    );
    expect(out.daysElapsedBeforeToday).toBe(31);
  });

  it('reports 0 days elapsed for a future-month budget', () => {
    // April currently, the budget is for May (still ahead).
    const out = getBudgetMonthHistory(
      makeBudget({
        currentDate: '2026-04-20',
        daysRemainingIncludingToday: 31,
      }),
    );
    expect(out.daysElapsedBeforeToday).toBe(0);
  });

  it('returns null average and diff when no complete days have elapsed (first of month)', () => {
    const out = getBudgetMonthHistory(
      makeBudget({
        currentDate: '2026-05-01',
        daysRemainingIncludingToday: 31,
      }),
    );
    expect(out.daysElapsedBeforeToday).toBe(0);
    expect(out.averageDailySpendBeforeToday).toBeNull();
    expect(out.diffVsOriginal).toBeNull();
  });

  it('computes the original daily target as amount / totalDaysInMonth (NOT remaining-days)', () => {
    // The point of `originalDailyTarget` is the "if you spent evenly from
    // day 1" plan — denominator is the full month, regardless of where we
    // are in it. amount=1000, May has 31 days → 32.258…
    const out = getBudgetMonthHistory(makeBudget());
    expect(out.originalDailyTarget).toBeCloseTo(1000 / 31, 6);
  });

  it('reports a positive diff when the user spent less than the original target on average', () => {
    // 17 past days with S/300 spent → avg 17.64/day. Original target =
    // 32.26/day → diff = +14.62 (user is saving).
    const out = getBudgetMonthHistory(
      makeBudget({
        spent: 300,
        remaining: 700,
        movements: [makeMovement('2026-05-05', 300)],
      }),
    );
    expect(out.averageDailySpendBeforeToday).toBeCloseTo(300 / 17, 6);
    expect(out.diffVsOriginal).toBeGreaterThan(0);
  });

  it('reports a negative diff when the user spent more than the original target on average', () => {
    // 17 past days with S/700 spent → avg 41.18/day. Target 32.26 →
    // diff = -8.92 (user is over plan).
    const out = getBudgetMonthHistory(
      makeBudget({
        spent: 700,
        remaining: 300,
        movements: [makeMovement('2026-05-05', 700)],
      }),
    );
    expect(out.diffVsOriginal).toBeLessThan(0);
  });
});

describe('getDailySpendHistory', () => {
  it('returns 7 buckets by default, oldest-first, with 0 for days that had no movements', () => {
    const budget = makeBudget({
      movements: [makeMovement('2026-05-15', 25), makeMovement('2026-05-18', 40)],
    });
    const out = getDailySpendHistory(budget);
    expect(out).toHaveLength(7);
    expect(out.map((d) => d.date)).toEqual([
      '2026-05-12',
      '2026-05-13',
      '2026-05-14',
      '2026-05-15',
      '2026-05-16',
      '2026-05-17',
      '2026-05-18',
    ]);
    expect(out.find((d) => d.date === '2026-05-15')?.spent).toBe(25);
    expect(out.find((d) => d.date === '2026-05-18')?.spent).toBe(40);
    // No movement on the 14th → bucket exists but stays at 0.
    expect(out.find((d) => d.date === '2026-05-14')?.spent).toBe(0);
  });

  it('trims days outside the budget month (no bars for April when the budget is for May)', () => {
    // Today is May 3 with default 7-day window → would normally include
    // April 27–30. Those don't belong to the May budget; drop them.
    const budget = makeBudget({ currentDate: '2026-05-03', daysRemainingIncludingToday: 29 });
    const out = getDailySpendHistory(budget);
    expect(out.map((d) => d.date)).toEqual(['2026-05-01', '2026-05-02', '2026-05-03']);
  });

  it('honors a custom window size', () => {
    const budget = makeBudget();
    const out = getDailySpendHistory(budget, 3);
    expect(out.map((d) => d.date)).toEqual(['2026-05-16', '2026-05-17', '2026-05-18']);
  });

  it('groups multiple movements on the same day into a single bucket', () => {
    // Repro: two coffee runs on the same day. Both should land in the same
    // bar — we don't render 2 separate entries.
    const budget = makeBudget({
      movements: [makeMovement('2026-05-17', 15, 'a'), makeMovement('2026-05-17', 25, 'b')],
    });
    const out = getDailySpendHistory(budget);
    expect(out.find((d) => d.date === '2026-05-17')?.spent).toBe(40);
  });
});
