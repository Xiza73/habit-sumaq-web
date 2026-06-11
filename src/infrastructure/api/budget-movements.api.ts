import { type BudgetMovement } from '@/core/domain/entities/budget-movement';
import {
  type CreateBudgetMovementInput,
  type UpdateBudgetMovementInput,
} from '@/core/domain/schemas/budget-movement.schema';

import { httpClient } from './http-client';

/**
 * API client for the v1.0.0 `budget_movements` backend module. Mirrors
 * the 5 endpoints from
 * `habit-sumaq-backend/docs/frontend/api-reference.md#budget-movements-v100`.
 *
 * During the parallel-run window (Phases A4 → A6), this client coexists
 * with the legacy `transactionsApi` create/update/delete calls that
 * carry a `budgetId`. The web is expected to call THIS module for new
 * UI work; the legacy entry points keep working until A6-W retires
 * them.
 */
export const budgetMovementsApi = {
  list(budgetId: string): Promise<BudgetMovement[]> {
    return httpClient.get<BudgetMovement[]>(
      `/budget-movements?budgetId=${encodeURIComponent(budgetId)}`,
    );
  },

  getById(id: string): Promise<BudgetMovement> {
    return httpClient.get<BudgetMovement>(`/budget-movements/${id}`);
  },

  create(data: CreateBudgetMovementInput): Promise<BudgetMovement> {
    return httpClient.post<BudgetMovement>('/budget-movements', data);
  },

  update(id: string, data: UpdateBudgetMovementInput): Promise<BudgetMovement> {
    return httpClient.patch<BudgetMovement>(`/budget-movements/${id}`, data);
  },

  delete(id: string): Promise<void> {
    return httpClient.delete<void>(`/budget-movements/${id}`);
  },
};
