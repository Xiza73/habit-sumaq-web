import { describe, expect, it } from 'vitest';

import { type DebtLoanSummaryRow } from '@/core/domain/entities/debt-loan';

import { DEFAULT_DEBTS_VIEW_PREFS, sortDebtRows } from './debts-sort';

function row(displayName: string, netOwed: number, pendingCount: number): DebtLoanSummaryRow {
  return {
    reference: displayName.toLowerCase(),
    displayName,
    currency: 'PEN',
    pendingDebt: netOwed < 0 ? Math.abs(netOwed) : 0,
    pendingLoan: netOwed > 0 ? netOwed : 0,
    netOwed,
    pendingCount,
    settledCount: 0,
  };
}

describe('sortDebtRows', () => {
  const ROWS: DebtLoanSummaryRow[] = [
    row('Carlos Pérez', -150, 1),
    row('María López', 200, 3),
    row('Mili', -50, 2),
  ];

  it('defaults to name ASC', () => {
    const sorted = sortDebtRows(ROWS, DEFAULT_DEBTS_VIEW_PREFS).map((r) => r.displayName);
    expect(sorted).toEqual(['Carlos Pérez', 'María López', 'Mili']);
  });

  it('sorts by name DESC', () => {
    const sorted = sortDebtRows(ROWS, { orderBy: 'name', orderDir: 'desc' }).map(
      (r) => r.displayName,
    );
    expect(sorted).toEqual(['Mili', 'María López', 'Carlos Pérez']);
  });

  it('sorts by netOwed using absolute value (DESC surfaces biggest exposures first)', () => {
    const sorted = sortDebtRows(ROWS, { orderBy: 'netOwed', orderDir: 'desc' }).map(
      (r) => r.displayName,
    );
    // |200| > |-150| > |-50|
    expect(sorted).toEqual(['María López', 'Carlos Pérez', 'Mili']);
  });

  it('sorts by pendingCount, breaking ties by name ASC', () => {
    const withTies: DebtLoanSummaryRow[] = [
      row('Zoe', 100, 2),
      row('Ana', 80, 2),
      row('Mili', 50, 5),
    ];
    const sorted = sortDebtRows(withTies, { orderBy: 'pendingCount', orderDir: 'asc' }).map(
      (r) => r.displayName,
    );
    // Both tied at 2: Ana before Zoe (alphabetical tie-breaker is NOT
    // flipped by direction — it's there for stability, not user intent).
    expect(sorted).toEqual(['Ana', 'Zoe', 'Mili']);
  });

  it('does not mutate the input array', () => {
    const original = [...ROWS];
    sortDebtRows(ROWS, { orderBy: 'name', orderDir: 'desc' });
    expect(ROWS).toEqual(original);
  });
});
