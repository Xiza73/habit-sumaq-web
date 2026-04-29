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
}

export const userSettingsApi = {
  getSettings(): Promise<UserSettings> {
    return httpClient.get<UserSettings>('/users/settings');
  },

  updateSettings(data: UpdateUserSettingsDto): Promise<UserSettings> {
    return httpClient.patch<UserSettings>('/users/settings', data);
  },
};
