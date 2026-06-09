import { describe, expect, it } from 'vitest';

import { type DebtLoanSummaryRow } from '@/core/domain/entities/debt-loan';

import { computeOverview, debtLoanKeys } from './use-debts-loans';

function makeRow(overrides: Partial<DebtLoanSummaryRow>): DebtLoanSummaryRow {
  return {
    reference: 'juan',
    currency: 'PEN',
    displayName: 'Juan',
    pendingDebt: 0,
    pendingLoan: 0,
    netOwed: 0,
    pendingCount: 0,
    settledCount: 0,
    ...overrides,
  };
}

describe('debtLoanKeys', () => {
  it('roots every key under ["debts-loans"] (separate from legacy transactions)', () => {
    expect(debtLoanKeys.all).toEqual(['debts-loans']);
    expect(debtLoanKeys.lists()).toEqual(['debts-loans', 'list']);
    expect(debtLoanKeys.summaries()).toEqual(['debts-loans', 'summary']);
    expect(debtLoanKeys.details()).toEqual(['debts-loans', 'detail']);
  });

  it('encodes the status filter in the list query key', () => {
    expect(debtLoanKeys.list('pending')).toEqual(['debts-loans', 'list', 'pending']);
    expect(debtLoanKeys.list('settled')).toEqual(['debts-loans', 'list', 'settled']);
    expect(debtLoanKeys.list('all')).toEqual(['debts-loans', 'list', 'all']);
  });

  it('encodes the status filter in the summary query key', () => {
    expect(debtLoanKeys.summary('pending')).toEqual(['debts-loans', 'summary', 'pending']);
    expect(debtLoanKeys.summary('all')).toEqual(['debts-loans', 'summary', 'all']);
  });

  it('keys each detail by id', () => {
    expect(debtLoanKeys.detail('abc-123')).toEqual(['debts-loans', 'detail', 'abc-123']);
  });
});

describe('computeOverview', () => {
  it('returns zeros for an empty list (no rows yet)', () => {
    expect(computeOverview([])).toEqual({
      totalPendingDebt: 0,
      totalPendingLoan: 0,
      netOwed: 0,
      groupCount: 0,
    });
  });

  it('sums pendingDebt across rows regardless of currency', () => {
    const rows = [
      makeRow({ pendingDebt: 100 }),
      makeRow({ pendingDebt: 250, currency: 'USD' }),
      makeRow({ pendingDebt: 0, currency: 'EUR' }),
    ];
    expect(computeOverview(rows).totalPendingDebt).toBe(350);
  });

  it('sums pendingLoan across rows', () => {
    const rows = [makeRow({ pendingLoan: 80 }), makeRow({ pendingLoan: 120 })];
    expect(computeOverview(rows).totalPendingLoan).toBe(200);
  });

  it('netOwed = totalPendingLoan - totalPendingDebt (you-owe-them when negative)', () => {
    const rows = [makeRow({ pendingDebt: 500, pendingLoan: 200 })];
    expect(computeOverview(rows).netOwed).toBe(-300);
  });

  it('counts the number of (reference, currency) groups', () => {
    const rows = [
      makeRow({ reference: 'juan', currency: 'PEN' }),
      makeRow({ reference: 'juan', currency: 'USD' }),
      makeRow({ reference: 'pedro', currency: 'PEN' }),
    ];
    expect(computeOverview(rows).groupCount).toBe(3);
  });
});
