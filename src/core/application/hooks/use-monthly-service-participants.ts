import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type MonthlyServiceParticipant } from '@/core/domain/entities/monthly-service-participant';
import { type MonthlyServiceParticipantRowInput } from '@/core/domain/schemas/monthly-service-participant.schema';

import { monthlyServicesApi } from '@/infrastructure/api/monthly-services.api';

import { monthlyServiceKeys } from './use-monthly-services';

/**
 * Query keys for the shared-service participant config endpoints
 * (`/monthly-services/:id/participants[...]`). Kept in their own
 * namespace so participant-config reads/writes don't collide with the
 * `['monthly-services']` cache — the replace mutation here still
 * invalidates that namespace too (see `useInvalidateParticipantsAndService`)
 * because `estimatedAmount` vs `sum(defaultAmount)` validation and the
 * service detail view both depend on the same config.
 */
export const monthlyServiceParticipantKeys = {
  all: ['monthly-service-participants'] as const,
  lists: () => [...monthlyServiceParticipantKeys.all, 'list'] as const,
  list: (monthlyServiceId: string) =>
    [...monthlyServiceParticipantKeys.lists(), monthlyServiceId] as const,
};

/** Same 5-minute stale-time as the sibling monthly-service(-payment) hooks. */
const STALE_TIME_MS = 5 * 60 * 1000;

export function useServiceParticipants(monthlyServiceId: string | undefined) {
  return useQuery({
    queryKey: monthlyServiceParticipantKeys.list(monthlyServiceId ?? ''),
    queryFn: () => monthlyServicesApi.getParticipants(monthlyServiceId!),
    enabled: Boolean(monthlyServiceId),
    staleTime: STALE_TIME_MS,
  });
}

/**
 * Invalidates the participant list for one service AND the
 * `['monthly-services']` list/detail caches — replacing the config doesn't
 * change `linkedDebts`/`paidAmountForCurrentMonth`, but the service detail
 * view renders the participant list alongside the service, so a stale
 * service cache would show config edits inconsistently until the next
 * unrelated refetch.
 */
function useInvalidateParticipantsAndService(monthlyServiceId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({
      queryKey: monthlyServiceParticipantKeys.list(monthlyServiceId),
    });
    void qc.invalidateQueries({ queryKey: monthlyServiceKeys.lists() });
    void qc.invalidateQueries({ queryKey: monthlyServiceKeys.detail(monthlyServiceId) });
  };
}

/**
 * Batch replace mutation for `PUT /monthly-services/:id/participants`. The
 * submitted array IS the resulting active set — there are no incremental
 * add/update/remove endpoints anymore. On success, invalidates the
 * participant list plus the `monthly-services` list/detail caches so
 * `linkedDebts`/the service detail view refresh consistently.
 */
export function useReplaceParticipants(monthlyServiceId: string) {
  const invalidate = useInvalidateParticipantsAndService(monthlyServiceId);
  return useMutation<MonthlyServiceParticipant[], Error, MonthlyServiceParticipantRowInput[]>({
    mutationFn: (participants) =>
      monthlyServicesApi.replaceParticipants(monthlyServiceId, participants),
    onSuccess: () => invalidate(),
  });
}
