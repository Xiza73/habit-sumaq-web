import { type DebtLoanSummaryRow } from '@/core/domain/entities/debt-loan';

export const DEBTS_ORDER_BY_OPTIONS = ['name', 'netOwed', 'pendingCount'] as const;
export type DebtsOrderBy = (typeof DEBTS_ORDER_BY_OPTIONS)[number];

export const DEBTS_ORDER_DIR_OPTIONS = ['asc', 'desc'] as const;
export type DebtsOrderDir = (typeof DEBTS_ORDER_DIR_OPTIONS)[number];

export interface DebtsViewPrefs {
  orderBy: DebtsOrderBy;
  orderDir: DebtsOrderDir;
}

export const DEFAULT_DEBTS_VIEW_PREFS: DebtsViewPrefs = {
  orderBy: 'name',
  orderDir: 'asc',
};

/**
 * Returns a sorted copy of the debts summary rows. Sorting is local to the
 * page (not persisted in user_settings) — the prefs live in component state
 * and reset on reload, mirroring the legacy `/transactions/debts` behavior
 * we are re-implementing here on the v1.0.0 `debts_loans` module.
 *
 * - `name`:         Locale-aware compare on `displayName`. Ties never expected
 *                   in practice (display names tend to be unique per user)
 *                   but the helper is stable so equal names stay in input order.
 * - `netOwed`:      Sorted by the ABSOLUTE value — both "you owe a lot" and
 *                   "you're owed a lot" surface at the top in `desc`. The sign
 *                   (DEBT vs LOAN) is visible in the card itself.
 * - `pendingCount`: Numeric. Ties broken by `displayName` asc so the order is
 *                   deterministic when many rows share the same count.
 */
export function sortDebtRows(
  rows: DebtLoanSummaryRow[],
  prefs: DebtsViewPrefs,
): DebtLoanSummaryRow[] {
  const copy = [...rows];
  const dirFactor = prefs.orderDir === 'asc' ? 1 : -1;

  copy.sort((a, b) => {
    let diff = 0;
    switch (prefs.orderBy) {
      case 'name':
        diff = a.displayName.localeCompare(b.displayName);
        break;
      case 'netOwed':
        diff = Math.abs(a.netOwed) - Math.abs(b.netOwed);
        break;
      case 'pendingCount':
        diff = a.pendingCount - b.pendingCount;
        break;
    }
    if (diff !== 0) return diff * dirFactor;
    // Tie-breaker: displayName ASC so the order stays deterministic. Not
    // flipped by `dirFactor` on purpose — the tie-breaker is for stability,
    // not user intent.
    return a.displayName.localeCompare(b.displayName);
  });

  return copy;
}
