import { describe, expect, it } from 'vitest';

import { type DebtsSummaryRow } from '@/core/domain/schemas/transaction.schema';

import { type DebtsViewPrefs, sortDebtRows } from './debts-sort';

function makeRow(overrides: Partial<DebtsSummaryRow>): DebtsSummaryRow {
  return {
    reference: 'x',
    currency: 'PEN',
    displayName: 'X',
    pendingDebt: 0,
    pendingLoan: 0,
    netOwed: 0,
    pendingCount: 0,
    settledCount: 0,
    ...overrides,
  };
}

const PREFS = (overrides: Partial<DebtsViewPrefs> = {}): DebtsViewPrefs => ({
  orderBy: 'name',
  orderDir: 'asc',
  ...overrides,
});

describe('sortDebtRows', () => {
  it('does not mutate the input array (returns a copy)', () => {
    const input = [makeRow({ displayName: 'B' }), makeRow({ displayName: 'A' })];
    const snapshot = input.map((r) => r.displayName);
    sortDebtRows(input, PREFS());
    expect(input.map((r) => r.displayName)).toEqual(snapshot);
  });

  describe('orderBy: name', () => {
    it('sorts displayName A→Z in asc, locale-aware', () => {
      const rows = [
        makeRow({ displayName: 'Carlos' }),
        makeRow({ displayName: 'Ana' }),
        makeRow({ displayName: 'Beto' }),
      ];
      const out = sortDebtRows(rows, PREFS({ orderBy: 'name', orderDir: 'asc' }));
      expect(out.map((r) => r.displayName)).toEqual(['Ana', 'Beto', 'Carlos']);
    });

    it('reverses in desc', () => {
      const rows = [makeRow({ displayName: 'Ana' }), makeRow({ displayName: 'Carlos' })];
      const out = sortDebtRows(rows, PREFS({ orderBy: 'name', orderDir: 'desc' }));
      expect(out.map((r) => r.displayName)).toEqual(['Carlos', 'Ana']);
    });
  });

  describe('orderBy: netOwed (absolute value)', () => {
    it('sorts by the ABSOLUTE net so big-debt and big-loan both surface in desc', () => {
      const rows = [
        makeRow({ displayName: 'Owes me a lot', netOwed: 5000 }),
        makeRow({ displayName: 'Owes nothing', netOwed: 0 }),
        makeRow({ displayName: 'I owe a lot', netOwed: -8000 }),
      ];
      const out = sortDebtRows(rows, PREFS({ orderBy: 'netOwed', orderDir: 'desc' }));
      expect(out.map((r) => r.displayName)).toEqual([
        'I owe a lot', // |−8000| = 8000
        'Owes me a lot', // |5000| = 5000
        'Owes nothing', // 0
      ]);
    });

    it('asc puts the smallest absolute values first', () => {
      const rows = [
        makeRow({ displayName: 'Owes me', netOwed: 10 }),
        makeRow({ displayName: 'I owe', netOwed: -1 }),
        makeRow({ displayName: 'Big debt', netOwed: -100 }),
      ];
      const out = sortDebtRows(rows, PREFS({ orderBy: 'netOwed', orderDir: 'asc' }));
      expect(out.map((r) => r.displayName)).toEqual(['I owe', 'Owes me', 'Big debt']);
    });
  });

  describe('orderBy: pendingCount', () => {
    it('sorts numerically in desc (most open items first)', () => {
      const rows = [
        makeRow({ displayName: 'Two', pendingCount: 2 }),
        makeRow({ displayName: 'Five', pendingCount: 5 }),
        makeRow({ displayName: 'One', pendingCount: 1 }),
      ];
      const out = sortDebtRows(rows, PREFS({ orderBy: 'pendingCount', orderDir: 'desc' }));
      expect(out.map((r) => r.displayName)).toEqual(['Five', 'Two', 'One']);
    });

    it('breaks ties by displayName asc — stable order across renders', () => {
      const rows = [
        makeRow({ displayName: 'Bruno', pendingCount: 3 }),
        makeRow({ displayName: 'Ana', pendingCount: 3 }),
        makeRow({ displayName: 'Carlos', pendingCount: 1 }),
      ];
      const out = sortDebtRows(rows, PREFS({ orderBy: 'pendingCount', orderDir: 'desc' }));
      // Two rows tied on pendingCount=3 → Ana before Bruno (name asc).
      expect(out.map((r) => r.displayName)).toEqual(['Ana', 'Bruno', 'Carlos']);
    });
  });
});
