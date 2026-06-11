import { type Budget, type BudgetWithKpi } from '@/core/domain/entities/budget';
import { type Currency } from '@/core/domain/enums/currency.enum';
import {
  type CreateBudgetInput,
  type UpdateBudgetInput,
} from '@/core/domain/schemas/budget.schema';

import { httpClient } from './http-client';

export const budgetsApi = {
  /** History list — no KPI, no movements. Newest period first. */
  getAll(): Promise<Budget[]> {
    return httpClient.get<Budget[]>('/budgets');
  },

  /**
   * Current month's budget for the given currency, with KPI + movements.
   * Returns `null` (200) when no budget exists for that month + currency —
   * the frontend renders a "create budget" CTA in that case.
   */
  getCurrent(currency: Currency): Promise<BudgetWithKpi | null> {
    return httpClient.get<BudgetWithKpi | null>(
      `/budgets/current?currency=${encodeURIComponent(currency)}`,
    );
  },

  getById(id: string): Promise<BudgetWithKpi> {
    return httpClient.get<BudgetWithKpi>(`/budgets/${id}`);
  },

  create(data: CreateBudgetInput): Promise<Budget> {
    return httpClient.post<Budget>('/budgets', data);
  },

  update(id: string, data: UpdateBudgetInput): Promise<Budget> {
    return httpClient.patch<Budget>(`/budgets/${id}`, data);
  },

  delete(id: string): Promise<void> {
    return httpClient.delete<void>(`/budgets/${id}`);
  },
};
