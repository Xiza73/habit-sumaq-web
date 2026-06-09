import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type DebtLoan,
  type DebtLoanStatusFilter,
  type DebtLoanSummaryRow,
} from '@/core/domain/entities/debt-loan';
import {
  type BulkSettleByReferenceInput,
  type CreateDebtLoanInput,
  type SettleDebtLoanInput,
  type UpdateDebtLoanInput,
} from '@/core/domain/schemas/debt-loan.schema';

import { debtsLoansApi } from '@/infrastructure/api/debts-loans.api';

/**
 * Query keys for the v1.0.0 `debts_loans` module. Kept in their own
 * namespace (`['debts-loans']`) so they don't collide with the legacy
 * `['transactions']` keys during the A3-A6 parallel-run window.
 */
export const debtLoanKeys = {
  all: ['debts-loans'] as const,
  lists: () => [...debtLoanKeys.all, 'list'] as const,
  list: (status: DebtLoanStatusFilter) => [...debtLoanKeys.lists(), status] as const,
  summaries: () => [...debtLoanKeys.all, 'summary'] as const,
  summary: (status: DebtLoanStatusFilter) => [...debtLoanKeys.summaries(), status] as const,
  details: () => [...debtLoanKeys.all, 'detail'] as const,
  detail: (id: string) => [...debtLoanKeys.details(), id] as const,
};

/** Same 5 min stale-time as the alerts hooks — derived data, cheap refetch. */
const DEBTS_STALE_TIME_MS = 5 * 60 * 1000;

export function useDebtsLoans(status: DebtLoanStatusFilter = 'pending') {
  return useQuery({
    queryKey: debtLoanKeys.list(status),
    queryFn: () => debtsLoansApi.list(status),
    staleTime: DEBTS_STALE_TIME_MS,
  });
}

export function useDebtsLoansSummary(status: DebtLoanStatusFilter = 'pending') {
  return useQuery({
    queryKey: debtLoanKeys.summary(status),
    queryFn: () => debtsLoansApi.summary(status),
    staleTime: DEBTS_STALE_TIME_MS,
  });
}

export function useDebtLoan(id: string) {
  return useQuery({
    queryKey: debtLoanKeys.detail(id),
    queryFn: () => debtsLoansApi.getById(id),
    enabled: Boolean(id),
    staleTime: DEBTS_STALE_TIME_MS,
  });
}

/**
 * Invalidate every query under `['debts-loans']`. Used as the
 * post-mutation default so list + summary + detail caches all refresh on
 * the next render.
 */
function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: debtLoanKeys.all });
}

export function useCreateDebtLoan() {
  const invalidate = useInvalidateAll();
  return useMutation<DebtLoan, Error, CreateDebtLoanInput>({
    mutationFn: (data) => debtsLoansApi.create(data),
    onSuccess: () => {
      void invalidate();
    },
  });
}

export function useUpdateDebtLoan() {
  const invalidate = useInvalidateAll();
  return useMutation<DebtLoan, Error, { id: string; data: UpdateDebtLoanInput }>({
    mutationFn: ({ id, data }) => debtsLoansApi.update(id, data),
    onSuccess: () => {
      void invalidate();
    },
  });
}

export function useDeleteDebtLoan() {
  const invalidate = useInvalidateAll();
  return useMutation<void, Error, string>({
    mutationFn: (id) => debtsLoansApi.delete(id),
    onSuccess: () => {
      void invalidate();
    },
  });
}

export function useSettleDebtLoan() {
  const invalidate = useInvalidateAll();
  return useMutation<DebtLoan, Error, { id: string; data: SettleDebtLoanInput }>({
    mutationFn: ({ id, data }) => debtsLoansApi.settle(id, data),
    onSuccess: () => {
      void invalidate();
    },
  });
}

export function useBulkSettleByReference() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (data: BulkSettleByReferenceInput) => debtsLoansApi.bulkSettleByReference(data),
    onSuccess: () => {
      void invalidate();
    },
  });
}

/**
 * Convenience computed view: groups summary rows into a flat shape with
 * derived flags. Used by the dashboard to render "X people owe you" and
 * "you owe Y people" tiles without recomputing in the component.
 */
export interface DebtsLoansOverview {
  totalPendingDebt: number;
  totalPendingLoan: number;
  netOwed: number;
  groupCount: number;
}

export function computeOverview(rows: DebtLoanSummaryRow[]): DebtsLoansOverview {
  let totalPendingDebt = 0;
  let totalPendingLoan = 0;
  for (const r of rows) {
    totalPendingDebt += r.pendingDebt;
    totalPendingLoan += r.pendingLoan;
  }
  return {
    totalPendingDebt,
    totalPendingLoan,
    netOwed: totalPendingLoan - totalPendingDebt,
    groupCount: rows.length,
  };
}
