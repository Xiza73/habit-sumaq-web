import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type MonthlyServicePayment } from '@/core/domain/entities/monthly-service-payment';
import {
  type CreateMonthlyServicePaymentInput,
  type UpdateMonthlyServicePaymentInput,
} from '@/core/domain/schemas/monthly-service-payment.schema';

import { monthlyServicePaymentsApi } from '@/infrastructure/api/monthly-service-payments.api';

/**
 * Query keys for the v1.0.0 `monthly_service_payments` module. Kept
 * in their own namespace (`['monthly-service-payments']`) so they
 * don't collide with the legacy `['transactions']` or
 * `['monthly-services']` keys during the A4 → A6 parallel-run window.
 */
export const monthlyServicePaymentKeys = {
  all: ['monthly-service-payments'] as const,
  lists: () => [...monthlyServicePaymentKeys.all, 'list'] as const,
  list: (monthlyServiceId: string) =>
    [...monthlyServicePaymentKeys.lists(), monthlyServiceId] as const,
  details: () => [...monthlyServicePaymentKeys.all, 'detail'] as const,
  detail: (id: string) => [...monthlyServicePaymentKeys.details(), id] as const,
};

/** Same 5-minute stale-time as the alerts / debts-loans hooks. */
const STALE_TIME_MS = 5 * 60 * 1000;

export function useMonthlyServicePayments(monthlyServiceId: string | undefined) {
  return useQuery({
    queryKey: monthlyServicePaymentKeys.list(monthlyServiceId ?? ''),
    queryFn: () => monthlyServicePaymentsApi.list(monthlyServiceId!),
    enabled: Boolean(monthlyServiceId),
    staleTime: STALE_TIME_MS,
  });
}

export function useMonthlyServicePayment(id: string) {
  return useQuery({
    queryKey: monthlyServicePaymentKeys.detail(id),
    queryFn: () => monthlyServicePaymentsApi.getById(id),
    enabled: Boolean(id),
    staleTime: STALE_TIME_MS,
  });
}

/**
 * Invalidate every query under `['monthly-service-payments']`. ALSO
 * invalidates `['monthly-services']` because the legacy service-detail
 * view (and the alerts/dashboard "next due" computation) reads
 * `lastPaidPeriod` from the legacy services endpoint. Until A5-B
 * rewires that read path to derive from `monthly_service_payments`
 * directly, a mutation here must refresh both caches.
 *
 * Same dual-invalidation pattern as `use-budget-movements`.
 */
function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: monthlyServicePaymentKeys.all });
    void qc.invalidateQueries({ queryKey: ['monthly-services'] });
  };
}

export function useCreateMonthlyServicePayment() {
  const invalidate = useInvalidateAll();
  return useMutation<MonthlyServicePayment, Error, CreateMonthlyServicePaymentInput>({
    mutationFn: (data) => monthlyServicePaymentsApi.create(data),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateMonthlyServicePayment() {
  const invalidate = useInvalidateAll();
  return useMutation<
    MonthlyServicePayment,
    Error,
    { id: string; data: UpdateMonthlyServicePaymentInput }
  >({
    mutationFn: ({ id, data }) => monthlyServicePaymentsApi.update(id, data),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteMonthlyServicePayment() {
  const invalidate = useInvalidateAll();
  return useMutation<void, Error, string>({
    mutationFn: (id) => monthlyServicePaymentsApi.delete(id),
    onSuccess: () => invalidate(),
  });
}

/**
 * Returns the latest paid period (lexicographically maxed YYYY-MM)
 * from a list of payments — handy for components that want to display
 * "last paid" without making a second roundtrip.
 *
 * Returns `null` for empty/undefined input. Currency-agnostic: it's
 * just the max period string.
 */
export function findLatestPaidPeriod(rows: MonthlyServicePayment[] | undefined): string | null {
  if (!rows || rows.length === 0) return null;
  let max = rows[0].period;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].period > max) max = rows[i].period;
  }
  return max;
}
