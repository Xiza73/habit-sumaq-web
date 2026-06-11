import { describe, expect, it } from 'vitest';

import { type BudgetMovement } from '@/core/domain/entities/budget-movement';

import { budgetMovementKeys, sumBudgetMovementsAmount } from './use-budget-movements';

function makeMovement(overrides: Partial<BudgetMovement>): BudgetMovement {
  return {
    id: 'm-1',
    userId: 'u-1',
    budgetId: 'b-1',
    currency: 'PEN',
    amount: 50,
    description: null,
    categoryId: null,
    date: '2026-06-15T12:00:00.000Z',
    createdAt: '2026-06-15T12:00:00.000Z',
    updatedAt: '2026-06-15T12:00:00.000Z',
    ...overrides,
  };
}

describe('budgetMovementKeys', () => {
  it('roots every key under ["budget-movements"]', () => {
    expect(budgetMovementKeys.all).toEqual(['budget-movements']);
    expect(budgetMovementKeys.lists()).toEqual(['budget-movements', 'list']);
    expect(budgetMovementKeys.details()).toEqual(['budget-movements', 'detail']);
  });

  it('encodes the budgetId in the list query key', () => {
    expect(budgetMovementKeys.list('b-abc')).toEqual(['budget-movements', 'list', 'b-abc']);
  });

  it('keys each detail by id', () => {
    expect(budgetMovementKeys.detail('m-xyz')).toEqual(['budget-movements', 'detail', 'm-xyz']);
  });
});

describe('sumBudgetMovementsAmount', () => {
  it('returns 0 when the list is undefined (initial render)', () => {
    expect(sumBudgetMovementsAmount(undefined)).toBe(0);
  });

  it('returns 0 for an empty array', () => {
    expect(sumBudgetMovementsAmount([])).toBe(0);
  });

  it('sums amounts across rows', () => {
    const rows = [
      makeMovement({ id: 'a', amount: 25 }),
      makeMovement({ id: 'b', amount: 75 }),
      makeMovement({ id: 'c', amount: 10.5 }),
    ];
    expect(sumBudgetMovementsAmount(rows)).toBe(110.5);
  });

  it('does NOT filter by currency — callers are responsible for that', () => {
    // The hook scopes to one budgetId which already implies one
    // currency, so the helper trusts the input.
    const rows = [
      makeMovement({ id: 'a', amount: 100, currency: 'PEN' }),
      makeMovement({ id: 'b', amount: 100, currency: 'USD' }),
    ];
    expect(sumBudgetMovementsAmount(rows)).toBe(200);
  });
});
