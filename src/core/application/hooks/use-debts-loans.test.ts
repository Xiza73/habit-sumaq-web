import { createElement, type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type DebtLoan, type DebtLoanSummaryRow } from '@/core/domain/entities/debt-loan';

import { debtsLoansApi } from '@/infrastructure/api/debts-loans.api';

import {
  computeOverview,
  debtLoanKeys,
  useBulkSettleByReference,
  useDeleteDebtLoan,
  useSettleDebtLoan,
} from './use-debts-loans';
import { monthlyServiceKeys } from './use-monthly-services';

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

vi.mock('@/infrastructure/api/debts-loans.api', () => ({
  debtsLoansApi: {
    settle: vi.fn(),
    delete: vi.fn(),
    bulkSettleByReference: vi.fn(),
  },
}));

function makeDebtLoan(overrides: Partial<DebtLoan> = {}): DebtLoan {
  return {
    id: 'd-1',
    userId: 'u-1',
    type: 'LOAN',
    reference: 'juan',
    currency: 'PEN',
    amount: 100,
    remainingAmount: 0,
    status: 'SETTLED',
    description: null,
    categoryId: null,
    date: '2026-06-15T12:00:00.000Z',
    createdAt: '2026-06-15T12:00:00.000Z',
    updatedAt: '2026-06-15T12:00:00.000Z',
    ...overrides,
  };
}

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return { Wrapper, invalidateSpy };
}

/**
 * `linkedDebts[]` on a MonthlyService only lists PENDING loans, so
 * settling/deleting a linked loan from the debts side must ALSO refresh
 * the `['monthly-services']` cache — otherwise the service card keeps
 * showing a "still pending" linked debt until an unrelated refetch.
 */
describe('debts-loans mutations invalidate BOTH debts-loans and monthly-services caches', () => {
  beforeEach(() => {
    vi.mocked(debtsLoansApi.settle).mockReset();
    vi.mocked(debtsLoansApi.delete).mockReset();
    vi.mocked(debtsLoansApi.bulkSettleByReference).mockReset();
  });

  it('useSettleDebtLoan invalidates debts-loans AND monthly-services on success', async () => {
    vi.mocked(debtsLoansApi.settle).mockResolvedValueOnce(makeDebtLoan());
    const { Wrapper, invalidateSpy } = makeWrapper();

    const { result } = renderHook(() => useSettleDebtLoan(), { wrapper: Wrapper });
    result.current.mutate({ id: 'd-1', data: { settledAmount: 100 } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: debtLoanKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: monthlyServiceKeys.all });
  });

  it('useDeleteDebtLoan invalidates debts-loans AND monthly-services on success', async () => {
    vi.mocked(debtsLoansApi.delete).mockResolvedValueOnce(undefined);
    const { Wrapper, invalidateSpy } = makeWrapper();

    const { result } = renderHook(() => useDeleteDebtLoan(), { wrapper: Wrapper });
    result.current.mutate('d-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: debtLoanKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: monthlyServiceKeys.all });
  });

  it('useBulkSettleByReference invalidates debts-loans AND monthly-services on success', async () => {
    vi.mocked(debtsLoansApi.bulkSettleByReference).mockResolvedValueOnce({
      settledCount: 2,
      totalSettledAmount: 200,
      currency: 'PEN',
      settledIds: ['d-1', 'd-2'],
    });
    const { Wrapper, invalidateSpy } = makeWrapper();

    const { result } = renderHook(() => useBulkSettleByReference(), { wrapper: Wrapper });
    result.current.mutate({ reference: 'juan', currency: 'PEN' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: debtLoanKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: monthlyServiceKeys.all });
  });
});
