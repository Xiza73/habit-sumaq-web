import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type CreateTransactionInput,
  type DebtsSummaryStatusFilter,
  type SettleByReferenceInput,
  type SettleTransactionInput,
  type TransactionFilters,
  type UpdateTransactionInput,
} from '@/core/domain/schemas/transaction.schema';

import { transactionsApi } from '@/infrastructure/api/transactions.api';

import { analytics } from '@/lib/analytics';

import { accountKeys } from './use-accounts';
import { alertKeys } from './use-alerts';

export const transactionKeys = {
  all: ['transactions'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  list: (filters: TransactionFilters = {}) => [...transactionKeys.lists(), filters] as const,
  details: () => [...transactionKeys.all, 'detail'] as const,
  detail: (id: string) => [...transactionKeys.details(), id] as const,
  debtsSummary: (status: DebtsSummaryStatusFilter) =>
    [...transactionKeys.all, 'debts-summary', status] as const,
};

export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: () => transactionsApi.getAll(filters),
    placeholderData: keepPreviousData,
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: transactionKeys.detail(id),
    queryFn: () => transactionsApi.getById(id),
    enabled: !!id,
  });
}

// Any mutation that creates / updates / deletes / settles a transaction MUST
// also invalidate the debts-summary cache: a new DEBT/LOAN won't surface on
// the /transactions/debts dashboard otherwise, and edits / settlements /
// deletes on existing DEBT/LOAN rows leave the dashboard counts stale. We
// invalidate the prefix `[..., 'debts-summary']` (without the status filter)
// so all three variants — pending / all / settled — refresh in one shot.
// Same pattern that `useSettleByReference` already uses; we just bring the
// rest of the mutating hooks in line.
const debtsSummaryPrefix = [...transactionKeys.all, 'debts-summary'] as const;

// Editing or deleting a transaction that's tied to a budget (`budgetId !==
// null`) shifts the budget's `spent` / KPI numbers. The mutation hooks
// don't know the budgetId at call-time, so we conservatively invalidate
// every budget query instead of trying to thread the budget id through —
// the cost is one extra refetch of the small `/budgets` payload, which is
// cheap and harmless when the transaction isn't a budget movement.
//
// Hardcoded to `['budgets']` instead of importing `budgetKeys.all` from
// `use-budgets.ts` because that module already imports `transactionKeys`
// from THIS file — going the other way would create a circular import.
// Keep this literal in sync with `budgetKeys.all` (re-confirmed on every
// touch of either file).
const budgetsAllPrefix = ['budgets'] as const;

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTransactionInput) => transactionsApi.create(data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: debtsSummaryPrefix });
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
      // A new EXPENSE linked to a budget can push `spent` over `amount`,
      // triggering `budget-overspent`. We don't know `budgetId` at call-time
      // for every entry point — invalidate conservatively.
      void queryClient.invalidateQueries({ queryKey: alertKeys.lists() });
      analytics.transactionCreated(variables.type);
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTransactionInput }) =>
      transactionsApi.update(id, data),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: transactionKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: debtsSummaryPrefix });
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
      void queryClient.invalidateQueries({ queryKey: budgetsAllPrefix });
      void queryClient.invalidateQueries({ queryKey: alertKeys.lists() });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => transactionsApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: debtsSummaryPrefix });
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
      void queryClient.invalidateQueries({ queryKey: budgetsAllPrefix });
      // Deleting a budget-linked expense lowers `spent` and may resolve overspent.
      void queryClient.invalidateQueries({ queryKey: alertKeys.lists() });
    },
  });
}

export function useSettleTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SettleTransactionInput }) =>
      transactionsApi.settle(id, data),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: transactionKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: debtsSummaryPrefix });
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}

export function useDebtsSummary(status: DebtsSummaryStatusFilter = 'pending') {
  return useQuery({
    queryKey: transactionKeys.debtsSummary(status),
    queryFn: () => transactionsApi.getDebtsSummary(status),
    placeholderData: keepPreviousData,
  });
}

export function useSettleByReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SettleByReferenceInput) => transactionsApi.settleByReference(data),
    onSuccess: (_result, variables) => {
      // Bulk settle flips statuses → invalidate lists and all debts-summary filters.
      void queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: [...transactionKeys.all, 'debts-summary'] });
      // Real-payment mode also moved an account balance → refresh accounts so
      // the dashboard / lists pick up the new totals.
      if (variables.accountId) {
        void queryClient.invalidateQueries({ queryKey: ['accounts'] });
      }
    },
  });
}
