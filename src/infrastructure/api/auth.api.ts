import { type User } from '@/core/domain/entities/user';

import { env } from '@/infrastructure/config/env';

import { httpClient } from './http-client';

export const authApi = {
  getGoogleLoginUrl(): string {
    return `${env.API_URL}/auth/google`;
  },

  getMe(): Promise<User> {
    return httpClient.get<User>('/auth/me');
  },

  async logout(): Promise<void> {
    await httpClient.post('/auth/logout');
  },
};
