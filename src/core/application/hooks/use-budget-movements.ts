import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type BudgetMovement } from '@/core/domain/entities/budget-movement';
import {
  type CreateBudgetMovementInput,
  type UpdateBudgetMovementInput,
} from '@/core/domain/schemas/budget-movement.schema';

import { budgetMovementsApi } from '@/infrastructure/api/budget-movements.api';

/**
 * Query keys for the v1.0.0 `budget_movements` module. Kept in their
 * own namespace (`['budget-movements']`) so they don't collide with
 * the legacy `['transactions']` or `['budgets']` keys during the
 * A4-A6 parallel-run window.
 */
export const budgetMovementKeys = {
  all: ['budget-movements'] as const,
  lists: () => [...budgetMovementKeys.all, 'list'] as const,
  list: (budgetId: string) => [...budgetMovementKeys.lists(), budgetId] as const,
  details: () => [...budgetMovementKeys.all, 'detail'] as const,
  detail: (id: string) => [...budgetMovementKeys.details(), id] as const,
};

/**
 * Tied to the budget detail view's freshness. Same 5-minute stale-time
 * as the alerts hooks — movements are derived data, cheap to refetch.
 */
const STALE_TIME_MS = 5 * 60 * 1000;

export function useBudgetMovements(budgetId: string | undefined) {
  return useQuery({
    queryKey: budgetMovementKeys.list(budgetId ?? ''),
    queryFn: () => budgetMovementsApi.list(budgetId!),
    enabled: Boolean(budgetId),
    staleTime: STALE_TIME_MS,
  });
}

export function useBudgetMovement(id: string) {
  return useQuery({
    queryKey: budgetMovementKeys.detail(id),
    queryFn: () => budgetMovementsApi.getById(id),
    enabled: Boolean(id),
    staleTime: STALE_TIME_MS,
  });
}

/**
 * Invalidate every query under `['budget-movements']`. Used as the
 * post-mutation default so list + detail caches refresh.
 *
 * We ALSO invalidate the legacy `['budgets']` key because the
 * budget's KPI card (spent vs total) is currently computed via the
 * legacy budgets read endpoint. Until A5-B rewires reports/KPIs to
 * pull from `budget_movements` directly, a mutation here must also
 * refresh the legacy budgets cache.
 */
function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: budgetMovementKeys.all });
    void qc.invalidateQueries({ queryKey: ['budgets'] });
  };
}

export function useCreateBudgetMovement() {
  const invalidate = useInvalidateAll();
  return useMutation<BudgetMovement, Error, CreateBudgetMovementInput>({
    mutationFn: (data) => budgetMovementsApi.create(data),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateBudgetMovement() {
  const invalidate = useInvalidateAll();
  return useMutation<BudgetMovement, Error, { id: string; data: UpdateBudgetMovementInput }>({
    mutationFn: ({ id, data }) => budgetMovementsApi.update(id, data),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteBudgetMovement() {
  const invalidate = useInvalidateAll();
  return useMutation<void, Error, string>({
    mutationFn: (id) => budgetMovementsApi.delete(id),
    onSuccess: () => invalidate(),
  });
}

/**
 * Sum-by-currency helper. The KPI math is currency-scoped — we never
 * mix PEN with USD. Returns 0 for an empty/undefined list so callers
 * can use it unconditionally.
 */
export function sumBudgetMovementsAmount(rows: BudgetMovement[] | undefined): number {
  if (!rows || rows.length === 0) return 0;
  return rows.reduce((acc, m) => acc + m.amount, 0);
}
