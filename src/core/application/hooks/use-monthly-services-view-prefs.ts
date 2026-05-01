'use client';

import { useEffect, useRef } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { type UserSettings } from '@/core/domain/entities/user-settings';
import {
  type MonthlyServicesGroupBy as GroupByValue,
  MonthlyServicesGroupBy,
  MonthlyServicesOrderBy,
  type MonthlyServicesOrderBy as OrderByValue,
  MonthlyServicesOrderDir,
  type MonthlyServicesOrderDir as OrderDirValue,
} from '@/core/domain/enums/common.enums';

import { ApiError } from '@/infrastructure/api/api-error';
import {
  type UpdateUserSettingsDto,
  userSettingsApi,
} from '@/infrastructure/api/user-settings.api';

import { userSettingsKeys, useUserSettings } from './use-user-settings';

const DEBOUNCE_MS = 300;

export interface MonthlyServicesViewPrefs {
  groupBy: GroupByValue;
  orderBy: OrderByValue;
  orderDir: OrderDirValue;
}

const DEFAULT_PREFS: MonthlyServicesViewPrefs = {
  groupBy: MonthlyServicesGroupBy.NONE,
  orderBy: MonthlyServicesOrderBy.NAME,
  orderDir: MonthlyServicesOrderDir.ASC,
};

interface MutationContext {
  /** Snapshot of `user_settings` from BEFORE this mutation's optimistic
   * patch — the value we restore on error. */
  previous: UserSettings | undefined;
}

function readPrefsFromCache(settings: UserSettings | undefined): MonthlyServicesViewPrefs {
  if (!settings) return DEFAULT_PREFS;
  return {
    groupBy: settings.monthlyServicesGroupBy,
    orderBy: settings.monthlyServicesOrderBy,
    orderDir: settings.monthlyServicesOrderDir,
  };
}

/**
 * Reads the monthly-services view preferences from `user_settings` and
 * exposes a `setPrefs(partial)` callback that:
 *   1. Optimistically patches the TanStack cache so the UI (and any other
 *      consumer of `useUserSettings`) updates immediately.
 *   2. Debounces the network PATCH so rapid clicks (e.g. flipping the
 *      direction back-and-forth) collapse into a single request.
 *   3. On error, rolls the cache back to the snapshot taken BEFORE this
 *      mutation's optimistic update — TanStack Query's `onMutate` context
 *      pattern, so consecutive errors can't compound into a stale target.
 *
 * The previous version mirrored `serverPrefs` into local React state and
 * tracked "last server value" via a ref synced through `useEffect`. That
 * tripped the React Compiler's `set-state-in-effect` rule AND captured the
 * optimistic value as "last server" (incorrect rollback target). This
 * version uses the query cache as the single source of truth — each
 * `setPrefs` reads the latest cached value to merge against, so rapid
 * back-and-forth clicks coalesce naturally without local mirror state.
 */
export function useMonthlyServicesViewPrefs(): {
  prefs: MonthlyServicesViewPrefs;
  setPrefs: (partial: Partial<MonthlyServicesViewPrefs>) => void;
} {
  const { data: settings } = useUserSettings();
  const queryClient = useQueryClient();

  const prefs = readPrefsFromCache(settings);

  const mutation = useMutation<UserSettings, unknown, MonthlyServicesViewPrefs, MutationContext>({
    mutationFn: (next) =>
      userSettingsApi.updateSettings({
        monthlyServicesGroupBy: next.groupBy,
        monthlyServicesOrderBy: next.orderBy,
        monthlyServicesOrderDir: next.orderDir,
      } satisfies UpdateUserSettingsDto),
    onMutate: async (next) => {
      // Cancel any in-flight settings refetch so it can't race the optimistic
      // patch and clobber our rollback snapshot.
      await queryClient.cancelQueries({ queryKey: userSettingsKeys.detail() });
      const previous = queryClient.getQueryData<UserSettings>(userSettingsKeys.detail());
      // Re-apply the optimistic patch here too. The `setPrefs` body already
      // patched the cache before scheduling the debounce, but if the user
      // never debounced (single-shot path) onMutate is the only place it
      // gets done.
      queryClient.setQueryData<UserSettings | undefined>(userSettingsKeys.detail(), (prev) =>
        prev
          ? {
              ...prev,
              monthlyServicesGroupBy: next.groupBy,
              monthlyServicesOrderBy: next.orderBy,
              monthlyServicesOrderDir: next.orderDir,
            }
          : prev,
      );
      return { previous };
    },
    onError: (error, _next, context) => {
      if (context?.previous) {
        queryClient.setQueryData(userSettingsKeys.detail(), context.previous);
      }
      const code = error instanceof ApiError ? error.code : null;
      toast.error(code ?? 'Could not save view preferences');
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: userSettingsKeys.all });
    },
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setPrefs(partial: Partial<MonthlyServicesViewPrefs>) {
    // Read the freshest value FROM THE CACHE on every click. If a previous
    // optimistic patch already landed (rapid clicks within the debounce
    // window), this picks it up — so the second click merges against the
    // first's optimistic state, not the stale server snapshot.
    const cached = queryClient.getQueryData<UserSettings>(userSettingsKeys.detail());
    const base = readPrefsFromCache(cached);
    const next: MonthlyServicesViewPrefs = { ...base, ...partial };

    // Snappy UI: patch the cache immediately so the controls reflect the
    // click before the debounce + network roundtrip.
    queryClient.setQueryData<UserSettings | undefined>(userSettingsKeys.detail(), (prev) =>
      prev
        ? {
            ...prev,
            monthlyServicesGroupBy: next.groupBy,
            monthlyServicesOrderBy: next.orderBy,
            monthlyServicesOrderDir: next.orderDir,
          }
        : prev,
    );

    // Coalesce rapid changes into a single PATCH.
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      mutation.mutate(next);
    }, DEBOUNCE_MS);
  }

  // Cleanup the pending debounce on unmount so a late mutation doesn't
  // overwrite a newer state set by another component.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { prefs, setPrefs };
}
