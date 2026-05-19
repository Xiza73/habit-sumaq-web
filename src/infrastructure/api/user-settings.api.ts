import { type UserSettings } from '@/core/domain/entities/user-settings';

import { httpClient } from './http-client';

export interface UpdateUserSettingsDto {
  language?: string;
  theme?: string;
  defaultCurrency?: string;
  dateFormat?: string;
  startOfWeek?: string;
  timezone?: string;
  monthlyServicesGroupBy?: string;
  monthlyServicesOrderBy?: string;
  monthlyServicesOrderDir?: string;
  /**
   * Max 4 entries, no duplicates. Backend rejects with 400 (ArrayMaxSize /
   * ArrayUnique). Empty array is valid — clears all favorites. Strings are
   * free-form; the canonical set lives in `src/lib/nav-registry.ts`.
   */
  favoriteKeys?: string[];
}

export const userSettingsApi = {
  getSettings(): Promise<UserSettings> {
    return httpClient.get<UserSettings>('/users/settings');
  },

  updateSettings(data: UpdateUserSettingsDto): Promise<UserSettings> {
    return httpClient.patch<UserSettings>('/users/settings', data);
  },
};
