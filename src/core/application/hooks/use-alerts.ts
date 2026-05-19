import { useMemo } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type AlertsListResponse } from '@/core/domain/entities/alert';

import { alertsApi } from '@/infrastructure/api/alerts.api';

export const alertKeys = {
  all: ['alerts'] as const,
  lists: () => [...alertKeys.all, 'list'] as const,
  list: () => [...alertKeys.lists()] as const,
};

/**
 * 5-minute stale-time matches the design call: alerts are derived data,
 * cheap to re-fetch, and refreshing more often would hammer the API for no
 * UX gain. Refetch-on-focus stays on (TanStack default) so users coming
 * back from another tab see a fresh state without manual interaction.
 *
 * `refetchOnMount` defaults to `true` — combined with `staleTime`, the
 * query refetches on mount only when the cache is older than 5 minutes,
 * which is exactly what we want.
 */
const ALERTS_STALE_TIME_MS = 5 * 60 * 1000;

export function useAlerts() {
  return useQuery({
    queryKey: alertKeys.list(),
    queryFn: () => alertsApi.getAll(),
    staleTime: ALERTS_STALE_TIME_MS,
  });
}

/**
 * Unread count for the bell badge. An alert is "unread" when its
 * `triggeredAt` is strictly newer than the user's `lastSeenAt`. If the
 * user never opened the popover (`lastSeenAt === null`), every alert is
 * counted as unread.
 *
 * Memoized so re-renders driven by parent state don't recompute the
 * comparison on every paint.
 */
export function useUnreadAlertCount(): number {
  const { data } = useAlerts();
  return useMemo(() => computeUnreadCount(data), [data]);
}

export function computeUnreadCount(data: AlertsListResponse | undefined): number {
  if (!data) return 0;
  if (!data.lastSeenAt) return data.alerts.length;
  const seenMs = new Date(data.lastSeenAt).getTime();
  return data.alerts.filter((a) => new Date(a.triggeredAt).getTime() > seenMs).length;
}

/**
 * Dismiss a per-day alert. Optimistically removes the row from the cached
 * list so the popover updates instantly — on error we invalidate to fall
 * back to the server state.
 */
export function useDismissAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) => alertsApi.dismiss(alertId),
    onMutate: async (alertId) => {
      await queryClient.cancelQueries({ queryKey: alertKeys.lists() });
      const previous = queryClient.getQueryData<AlertsListResponse>(alertKeys.list());
      if (previous) {
        queryClient.setQueryData<AlertsListResponse>(alertKeys.list(), {
          ...previous,
          alerts: previous.alerts.filter((a) => a.id !== alertId),
        });
      }
      return { previous };
    },
    onError: (_err, _alertId, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(alertKeys.list(), ctx.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: alertKeys.lists() });
    },
  });
}

/**
 * Bump `lastSeenAt` server-side and update the cached value optimistically
 * so the bell badge drops to zero the instant the popover opens — no
 * waiting for a roundtrip.
 *
 * We deliberately do NOT touch `user_settings` cache here (the backend
 * doesn't bump `updatedAt`).
 */
export function useMarkAlertsSeen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => alertsApi.markSeen(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: alertKeys.lists() });
      const previous = queryClient.getQueryData<AlertsListResponse>(alertKeys.list());
      if (previous) {
        queryClient.setQueryData<AlertsListResponse>(alertKeys.list(), {
          ...previous,
          lastSeenAt: new Date().toISOString(),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(alertKeys.list(), ctx.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: alertKeys.lists() });
    },
  });
}
