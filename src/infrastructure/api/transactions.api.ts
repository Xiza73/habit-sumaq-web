import { type Transaction } from '@/core/domain/entities/transaction';
import {
  type BulkSettleResult,
  type CreateTransactionInput,
  type DebtsSummaryRow,
  type DebtsSummaryStatusFilter,
  type SettleByReferenceInput,
  type SettleTransactionInput,
  type TransactionFilters,
  type UpdateTransactionInput,
} from '@/core/domain/schemas/transaction.schema';

import { httpClient, type PaginatedResponse } from './http-client';

function buildQuery(filters: TransactionFilters): string {
  const params = new URLSearchParams();
  if (filters.accountId) params.set('accountId', filters.accountId);
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.type) params.set('type', filters.type);
  if (filters.status) params.set('status', filters.status);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.search && filters.search.trim() !== '') params.set('search', filters.search.trim());
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const transactionsApi = {
  getAll(filters: TransactionFilters = {}): Promise<PaginatedResponse<Transaction[]>> {
    return httpClient.getWithMeta<Transaction[]>(`/transactions${buildQuery(filters)}`);
  },

  getById(id: string): Promise<Transaction> {
    return httpClient.get<Transaction>(`/transactions/${id}`);
  },

  create(data: CreateTransactionInput): Promise<Transaction> {
    return httpClient.post<Transaction>('/transactions', data);
  },

  update(id: string, data: UpdateTransactionInput): Promise<Transaction> {
    return httpClient.patch<Transaction>(`/transactions/${id}`, data);
  },

  delete(id: string): Promise<void> {
    return httpClient.delete<void>(`/transactions/${id}`);
  },

  settle(id: string, data: SettleTransactionInput): Promise<Transaction> {
    return httpClient.post<Transaction>(`/transactions/${id}/settle`, data);
  },

  getDebtsSummary(status: DebtsSummaryStatusFilter = 'pending'): Promise<DebtsSummaryRow[]> {
    return httpClient.get<DebtsSummaryRow[]>(`/transactions/debts-summary?status=${status}`);
  },

  settleByReference(data: SettleByReferenceInput): Promise<BulkSettleResult> {
    return httpClient.post<BulkSettleResult>('/transactions/settle-by-reference', data);
  },
};
