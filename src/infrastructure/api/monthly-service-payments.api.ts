import { type MonthlyServicePayment } from '@/core/domain/entities/monthly-service-payment';
import {
  type CreateMonthlyServicePaymentInput,
  type UpdateMonthlyServicePaymentInput,
} from '@/core/domain/schemas/monthly-service-payment.schema';

import { httpClient } from './http-client';

/**
 * API client for the v1.0.0 `monthly_service_payments` backend module.
 * Mirrors the 5 endpoints from
 * `habit-sumaq-backend/docs/frontend/api-reference.md#monthly-service-payments-v100`.
 *
 * Coexists with the legacy `transactionsApi` calls carrying a
 * `monthlyServiceId` until A6-W retires them.
 */
export const monthlyServicePaymentsApi = {
  list(monthlyServiceId: string): Promise<MonthlyServicePayment[]> {
    return httpClient.get<MonthlyServicePayment[]>(
      `/monthly-service-payments?monthlyServiceId=${encodeURIComponent(monthlyServiceId)}`,
    );
  },

  getById(id: string): Promise<MonthlyServicePayment> {
    return httpClient.get<MonthlyServicePayment>(`/monthly-service-payments/${id}`);
  },

  create(data: CreateMonthlyServicePaymentInput): Promise<MonthlyServicePayment> {
    return httpClient.post<MonthlyServicePayment>('/monthly-service-payments', data);
  },

  update(id: string, data: UpdateMonthlyServicePaymentInput): Promise<MonthlyServicePayment> {
    return httpClient.patch<MonthlyServicePayment>(`/monthly-service-payments/${id}`, data);
  },

  delete(id: string): Promise<void> {
    return httpClient.delete<void>(`/monthly-service-payments/${id}`);
  },
};
