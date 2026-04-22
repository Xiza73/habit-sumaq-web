import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type CreateMonthlyServiceInput,
  type PayMonthlyServiceInput,
  type UpdateMonthlyServiceInput,
} from '@/core/domain/schemas/monthly-service.schema';

import { monthlyServicesApi } from '@/infrastructure/api/monthly-services.api';

import { accountKeys } from './use-accounts';
import { transactionKeys } from './use-transactions';

export const monthlyServiceKeys = {
  all: ['monthly-services'] as const,
  lists: () => [...monthlyServiceKeys.all, 'list'] as const,
  list: (includeArchived?: boolean) =>
    [...monthlyServiceKeys.lists(), { includeArchived }] as const,
  details: () => [...monthlyServiceKeys.all, 'detail'] as const,
  detail: (id: string) => [...monthlyServiceKeys.details(), id] as const,
};

export function useMonthlyServices(includeArchived = false) {
  return useQuery({
    queryKey: monthlyServiceKeys.list(includeArchived),
    queryFn: () => monthlyServicesApi.getAll(includeArchived),
  });
}

export function useMonthlyService(id: string) {
  return useQuery({
    queryKey: monthlyServiceKeys.detail(id),
    queryFn: () => monthlyServicesApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateMonthlyService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMonthlyServiceInput) => monthlyServicesApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: monthlyServiceKeys.lists() });
    },
  });
}

export function useUpdateMonthlyService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMonthlyServiceInput }) =>
      monthlyServicesApi.update(id, data),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: monthlyServiceKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: monthlyServiceKeys.detail(id) });
    },
  });
}

/**
 * Paying creates an EXPENSE transaction that debits the account, so we also
 * invalidate `transactions` (for the list page) and `accounts` (for balance).
 */
export function usePayMonthlyService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PayMonthlyServiceInput }) =>
      monthlyServicesApi.pay(id, data),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: monthlyServiceKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: monthlyServiceKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}

export function useSkipMonthlyServiceMonth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => monthlyServicesApi.skip(id),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: monthlyServiceKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: monthlyServiceKeys.detail(id) });
    },
  });
}

export function useArchiveMonthlyService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => monthlyServicesApi.toggleArchive(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: monthlyServiceKeys.lists() });
    },
  });
}

export function useDeleteMonthlyService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => monthlyServicesApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: monthlyServiceKeys.lists() });
    },
  });
}
