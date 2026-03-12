import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type UpdateUserSettingsDto,
  userSettingsApi,
} from '@/infrastructure/api/user-settings.api';

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

export function useUpdateUserSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUserSettingsDto) => userSettingsApi.updateSettings(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userSettingsKeys.all });
    },
  });
}
