import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type DateFormat } from '@/core/domain/enums/common.enums';

import {
  type UpdateUserSettingsDto,
  userSettingsApi,
} from '@/infrastructure/api/user-settings.api';

import { DEFAULT_FAVORITES } from '@/lib/nav-registry';

export const userSettingsKeys = {
  all: ['user-settings'] as const,
  detail: () => [...userSettingsKeys.all, 'detail'] as const,
};

export function useUserSettings() {
  return useQuery({
    queryKey: userSettingsKeys.detail(),
    queryFn: () => userSettingsApi.getSettings(),
  });
}

/**
 * Returns the user's preferred `dateFormat` for rendering calendar dates.
 *
 * The user's pref lives in `userSettings.dateFormat` (PATCH'd from
 * `/settings`). This hook is the **single source of truth** for that value
 * — any surface that renders a calendar date MUST use this hook + the
 * `formatDate` helper from `@/lib/format`. Falling back to the browser's
 * `Date.toLocaleDateString()` (or hand-rolled `${day}/${month}/${year}`)
 * silently ignores the user pref and renders inconsistently across the
 * app — see [business-rules.md](docs/frontend/business-rules.md#date-display).
 *
 * Defaults to `YYYY-MM-DD` (least ambiguous) while the settings query is
 * still loading or for unauthenticated surfaces, matching the inline
 * fallback that was duplicated across DatePicker / HabitList before this
 * hook existed.
 */
export function useDateFormat(): DateFormat {
  const { data: settings } = useUserSettings();
  return settings?.dateFormat ?? 'YYYY-MM-DD';
}

/**
 * Returns the user's favorite nav keys, falling back to `DEFAULT_FAVORITES`
 * while the settings query is in flight or when the user hasn't customized
 * them (the backend default matches anyway, but this keeps the first paint
 * consistent without flicker).
 *
 * Companion to {@link useUpdateFavorites} for the write side. Both
 * surfaces (mobile bottom nav + sidebar ★) read from here so they stay in
 * sync the moment the mutation invalidates the settings query.
 */
export function useFavoriteKeys(): string[] {
  const { data: settings } = useUserSettings();
  // settings can be undefined (loading) or have `favoriteKeys: undefined`
  // (older backend response shape, pre-migration). Defensive fallback either way.
  return settings?.favoriteKeys ?? DEFAULT_FAVORITES;
}

export function useUpdateUserSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUserSettingsDto) => userSettingsApi.updateSettings(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userSettingsKeys.all });
    },
  });
}
