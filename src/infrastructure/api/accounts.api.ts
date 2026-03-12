import { type Account } from '@/core/domain/entities/account';
import {
  type CreateAccountInput,
  type UpdateAccountInput,
} from '@/core/domain/schemas/account.schema';

import { httpClient } from './http-client';

export const accountsApi = {
  getAll(includeArchived = false): Promise<Account[]> {
    const query = includeArchived ? '?includeArchived=true' : '';
    return httpClient.get<Account[]>(`/accounts${query}`);
  },

  getById(id: string): Promise<Account> {
    return httpClient.get<Account>(`/accounts/${id}`);
  },

  create(data: CreateAccountInput): Promise<Account> {
    return httpClient.post<Account>('/accounts', data);
  },

  update(id: string, data: UpdateAccountInput): Promise<Account> {
    return httpClient.patch<Account>(`/accounts/${id}`, data);
  },

  toggleArchive(id: string): Promise<Account> {
    return httpClient.patch<Account>(`/accounts/${id}/archive`);
  },

  delete(id: string): Promise<void> {
    return httpClient.delete<void>(`/accounts/${id}`);
  },
};
