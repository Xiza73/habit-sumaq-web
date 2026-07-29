import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type MonthlyServiceParticipant } from '@/core/domain/entities/monthly-service-participant';
import {
  type AddMonthlyServiceParticipantInput,
  type UpdateMonthlyServiceParticipantInput,
} from '@/core/domain/schemas/monthly-service-participant.schema';

import { monthlyServicesApi } from '@/infrastructure/api/monthly-services.api';

import { monthlyServiceKeys } from './use-monthly-services';

/**
 * Query keys for the shared-service participant config endpoints
 * (`/monthly-services/:id/participants[...]`). Kept in their own
 * namespace so participant-config reads/writes don't collide with the
 * `['monthly-services']` cache — mutations here still invalidate that
 * namespace too (see `useInvalidateParticipantsAndService`) because
 * `estimatedAmount` vs `sum(defaultAmount)` validation and the service
 * detail view both depend on the same config.
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
 * `['monthly-services']` list/detail caches — config CRUD doesn't change
 * `linkedDebts`/`paidAmountForCurrentMonth`, but the service detail view
 * renders the participant list alongside the service, so a stale service
 * cache would show config edits inconsistently until the next unrelated
 * refetch.
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

export function useAddParticipant(monthlyServiceId: string) {
  const invalidate = useInvalidateParticipantsAndService(monthlyServiceId);
  return useMutation<MonthlyServiceParticipant, Error, AddMonthlyServiceParticipantInput>({
    mutationFn: (data) => monthlyServicesApi.addParticipant(monthlyServiceId, data),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateParticipant(monthlyServiceId: string) {
  const invalidate = useInvalidateParticipantsAndService(monthlyServiceId);
  return useMutation<
    MonthlyServiceParticipant,
    Error,
    { participantId: string; data: UpdateMonthlyServiceParticipantInput }
  >({
    mutationFn: ({ participantId, data }) =>
      monthlyServicesApi.updateParticipant(monthlyServiceId, participantId, data),
    onSuccess: () => invalidate(),
  });
}

export function useRemoveParticipant(monthlyServiceId: string) {
  const invalidate = useInvalidateParticipantsAndService(monthlyServiceId);
  return useMutation<void, Error, string>({
    mutationFn: (participantId) =>
      monthlyServicesApi.removeParticipant(monthlyServiceId, participantId),
    onSuccess: () => invalidate(),
  });
}
