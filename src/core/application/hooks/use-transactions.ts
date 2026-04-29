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

import { accountKeys } from './use-accounts';

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

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTransactionInput) => transactionsApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
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
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => transactionsApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
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
