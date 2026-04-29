'use client';

import { useEffect, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
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

/**
 * Reads the monthly-services view preferences from `user_settings` and exposes
 * a `setPrefs(partial)` callback that:
 *   1. Updates the TanStack cache **immediately** (optimistic) so the UI feels
 *      snappy.
 *   2. Debounces the network PATCH so rapid clicks (e.g. toggling the dir
 *      back-and-forth) collapse into a single request.
 *   3. On error, rolls back the cache to the last server-confirmed value
 *      and shows a toast.
 *
 * Defaults to `{ none, name, asc }` while settings are still loading — the
 * UI renders the same as it always did before this PR.
 */
export function useMonthlyServicesViewPrefs(): {
  prefs: MonthlyServicesViewPrefs;
  setPrefs: (partial: Partial<MonthlyServicesViewPrefs>) => void;
} {
  const { data: settings } = useUserSettings();
  const queryClient = useQueryClient();

  const serverPrefs: MonthlyServicesViewPrefs = settings
    ? {
        groupBy: settings.monthlyServicesGroupBy,
        orderBy: settings.monthlyServicesOrderBy,
        orderDir: settings.monthlyServicesOrderDir,
      }
    : DEFAULT_PREFS;

  // Local state mirrors the server prefs but updates immediately on
  // setPrefs(...) so the controls feel snappy. We re-sync from the server
  // whenever the cached settings change.
  const [localPrefs, setLocalPrefs] = useState<MonthlyServicesViewPrefs>(serverPrefs);

  useEffect(() => {
    setLocalPrefs(serverPrefs);
    // We deliberately depend on the underlying values, not the object — same
    // values shouldn't trigger a re-sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverPrefs.groupBy, serverPrefs.orderBy, serverPrefs.orderDir]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastServerPrefsRef = useRef<MonthlyServicesViewPrefs>(serverPrefs);

  // Keep a ref of the last KNOWN server value so onError can roll back cleanly
  // even if the user kept clicking during the debounce window.
  useEffect(() => {
    lastServerPrefsRef.current = serverPrefs;
  }, [serverPrefs.groupBy, serverPrefs.orderBy, serverPrefs.orderDir]); // eslint-disable-line react-hooks/exhaustive-deps

  function setPrefs(partial: Partial<MonthlyServicesViewPrefs>) {
    const next: MonthlyServicesViewPrefs = { ...localPrefs, ...partial };
    setLocalPrefs(next);

    // Optimistically patch the user-settings cache so any other consumer
    // (e.g. the Settings page) sees the new values immediately too.
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
      const payload: UpdateUserSettingsDto = {
        monthlyServicesGroupBy: next.groupBy,
        monthlyServicesOrderBy: next.orderBy,
        monthlyServicesOrderDir: next.orderDir,
      };
      void userSettingsApi.updateSettings(payload).then(
        () => {
          // Server confirmed — invalidate to pick up updatedAt etc.
          void queryClient.invalidateQueries({ queryKey: userSettingsKeys.all });
        },
        (error: unknown) => {
          // Roll back to the last server-confirmed value.
          const fallback = lastServerPrefsRef.current;
          setLocalPrefs(fallback);
          queryClient.setQueryData<UserSettings | undefined>(userSettingsKeys.detail(), (prev) =>
            prev
              ? {
                  ...prev,
                  monthlyServicesGroupBy: fallback.groupBy,
                  monthlyServicesOrderBy: fallback.orderBy,
                  monthlyServicesOrderDir: fallback.orderDir,
                }
              : prev,
          );
          const code = error instanceof ApiError ? error.code : null;
          toast.error(code ?? 'Could not save view preferences');
        },
      );
    }, DEBOUNCE_MS);
  }

  // Cleanup the pending debounce on unmount so a late mutation doesn't
  // overwrite a newer state set by another component.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { prefs: localPrefs, setPrefs };
}
