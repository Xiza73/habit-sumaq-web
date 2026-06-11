import { type MonthlyService } from '@/core/domain/entities/monthly-service';
import {
  type CreateMonthlyServiceInput,
  type UpdateMonthlyServiceInput,
} from '@/core/domain/schemas/monthly-service.schema';

import { httpClient } from './http-client';

export const monthlyServicesApi = {
  getAll(includeArchived = false): Promise<MonthlyService[]> {
    const query = includeArchived ? '?includeArchived=true' : '';
    return httpClient.get<MonthlyService[]>(`/monthly-services${query}`);
  },

  getById(id: string): Promise<MonthlyService> {
    return httpClient.get<MonthlyService>(`/monthly-services/${id}`);
  },

  create(data: CreateMonthlyServiceInput): Promise<MonthlyService> {
    return httpClient.post<MonthlyService>('/monthly-services', data);
  },

  update(id: string, data: UpdateMonthlyServiceInput): Promise<MonthlyService> {
    return httpClient.patch<MonthlyService>(`/monthly-services/${id}`, data);
  },

  /** Skips the current period without creating a payment. */
  skip(id: string): Promise<MonthlyService> {
    return httpClient.post<MonthlyService>(`/monthly-services/${id}/skip`);
  },

  toggleArchive(id: string): Promise<MonthlyService> {
    return httpClient.patch<MonthlyService>(`/monthly-services/${id}/archive`);
  },

  /** Hard soft-delete. Fails with `MSVC_001` if the service has payments. */
  delete(id: string): Promise<void> {
    return httpClient.delete<void>(`/monthly-services/${id}`);
  },
};
