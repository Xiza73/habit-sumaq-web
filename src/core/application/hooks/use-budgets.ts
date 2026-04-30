import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type Currency } from '@/core/domain/enums/account.enums';
import {
  type AddBudgetMovementInput,
  type CreateBudgetInput,
  type UpdateBudgetInput,
} from '@/core/domain/schemas/budget.schema';

import { budgetsApi } from '@/infrastructure/api/budgets.api';

import { accountKeys } from './use-accounts';
import { transactionKeys } from './use-transactions';

export const budgetKeys = {
  all: ['budgets'] as const,
  lists: () => [...budgetKeys.all, 'list'] as const,
  list: () => [...budgetKeys.lists()] as const,
  current: (currency: Currency) => [...budgetKeys.all, 'current', currency] as const,
  details: () => [...budgetKeys.all, 'detail'] as const,
  detail: (id: string) => [...budgetKeys.details(), id] as const,
};

/** History — list of all budgets the user has ever created (no KPI). */
export function useBudgets() {
  return useQuery({
    queryKey: budgetKeys.list(),
    queryFn: () => budgetsApi.getAll(),
  });
}

/**
 * Current month's budget for the given currency. Resolves to `null` when no
 * budget exists for that month — components render a "create budget" CTA.
 */
export function useCurrentBudget(currency: Currency) {
  return useQuery({
    queryKey: budgetKeys.current(currency),
    queryFn: () => budgetsApi.getCurrent(currency),
  });
}

/** Detail view (with KPI + movements) by id. Used for historical budgets. */
export function useBudget(id: string) {
  return useQuery({
    queryKey: budgetKeys.detail(id),
    queryFn: () => budgetsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBudgetInput) => budgetsApi.create(data),
    onSuccess: (_, variables) => {
      // Invalidate the current-month query for the budget's currency so the
      // dashboard switches from "no budget" CTA to the freshly created KPI.
      void queryClient.invalidateQueries({ queryKey: budgetKeys.current(variables.currency) });
      void queryClient.invalidateQueries({ queryKey: budgetKeys.lists() });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBudgetInput }) =>
      budgetsApi.update(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: budgetKeys.all });
    },
  });
}

/**
 * Soft-deletes the budget AND nullifies `budgetId` on every linked transaction
 * server-side. We invalidate the entire budget cache, plus transactions and
 * accounts (the linked txs surface in the global tx list with `budgetId: null`
 * after deletion).
 */
export function useDeleteBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => budgetsApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: budgetKeys.all });
      void queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
    },
  });
}

/**
 * Adding a movement creates an EXPENSE transaction + debits the account, so
 * we invalidate budgets (KPI changes), transactions (list refresh), and
 * accounts (balance update).
 */
export function useAddBudgetMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AddBudgetMovementInput }) =>
      budgetsApi.addMovement(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: budgetKeys.all });
      void queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}
