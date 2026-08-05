import {
  type DebtLoan,
  type DebtLoanPayment,
  type DebtLoanStatusFilter,
  type DebtLoanSummaryRow,
  type SettleAmountResult,
} from '@/core/domain/entities/debt-loan';
import {
  type CreateDebtLoanInput,
  type SettleAmountByReferenceInput,
  type SettleDebtLoanInput,
  type UpdateDebtLoanInput,
  type UpdateDebtLoanPaymentInput,
} from '@/core/domain/schemas/debt-loan.schema';

import { httpClient } from './http-client';

function buildStatusQuery(status?: DebtLoanStatusFilter): string {
  if (!status || status === 'pending') return '';
  return `?status=${status}`;
}

/**
 * API client for the v1.0.0 `debts_loans` backend module. Mirrors the
 * endpoints from
 * `habit-sumaq-backend/docs/frontend/api-reference.md#debts-and-loans`.
 * The legacy all-or-nothing `/debts/settle-by-reference` endpoint still
 * exists on the backend but is no longer called by the web (replaced by
 * `settleAmountByReference`).
 *
 * During the parallel-run window (Phases A3–A6), this client coexists
 * with the legacy `transactionsApi` DEBT/LOAN endpoints. The web is
 * expected to call THIS module for the new `/debts` route; the legacy
 * route in `/transactions/debts` keeps calling `transactionsApi`.
 */
export const debtsLoansApi = {
  list(status?: DebtLoanStatusFilter): Promise<DebtLoan[]> {
    return httpClient.get<DebtLoan[]>(`/debts${buildStatusQuery(status)}`);
  },

  summary(status?: DebtLoanStatusFilter): Promise<DebtLoanSummaryRow[]> {
    return httpClient.get<DebtLoanSummaryRow[]>(`/debts/summary${buildStatusQuery(status)}`);
  },

  getById(id: string): Promise<DebtLoan> {
    return httpClient.get<DebtLoan>(`/debts/${id}`);
  },

  create(data: CreateDebtLoanInput): Promise<DebtLoan> {
    return httpClient.post<DebtLoan>('/debts', data);
  },

  update(id: string, data: UpdateDebtLoanInput): Promise<DebtLoan> {
    return httpClient.patch<DebtLoan>(`/debts/${id}`, data);
  },

  delete(id: string): Promise<void> {
    return httpClient.delete<void>(`/debts/${id}`);
  },

  settle(id: string, data: SettleDebtLoanInput): Promise<DebtLoan> {
    return httpClient.post<DebtLoan>(`/debts/${id}/settle`, data);
  },

  settleAmountByReference(data: SettleAmountByReferenceInput): Promise<SettleAmountResult> {
    return httpClient.post<SettleAmountResult>('/debts/settle-amount-by-reference', data);
  },

  /**
   * Backend orders DESC by `createdAt` — the UI keeps that order, so
   * the most recent payment is always at the top of the list.
   */
  listPayments(debtId: string): Promise<DebtLoanPayment[]> {
    return httpClient.get<DebtLoanPayment[]>(`/debts/${debtId}/payments`);
  },

  updatePayment(paymentId: string, data: UpdateDebtLoanPaymentInput): Promise<DebtLoanPayment> {
    return httpClient.patch<DebtLoanPayment>(`/debts/payments/${paymentId}`, data);
  },

  deletePayment(paymentId: string): Promise<void> {
    return httpClient.delete<void>(`/debts/payments/${paymentId}`);
  },
};
