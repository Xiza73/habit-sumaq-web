import { type MonthlyService } from '@/core/domain/entities/monthly-service';
import { type MonthlyServiceParticipant } from '@/core/domain/entities/monthly-service-participant';
import {
  type CreateMonthlyServiceInput,
  type UpdateMonthlyServiceInput,
} from '@/core/domain/schemas/monthly-service.schema';
import { type MonthlyServiceParticipantRowInput } from '@/core/domain/schemas/monthly-service-participant.schema';

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

  /** Lists the configured shared-service participants for a service. */
  getParticipants(monthlyServiceId: string): Promise<MonthlyServiceParticipant[]> {
    return httpClient.get<MonthlyServiceParticipant[]>(
      `/monthly-services/${monthlyServiceId}/participants`,
    );
  },

  /**
   * Replaces the WHOLE active participant list for a service in one shot
   * (batch model — no incremental add/update/remove endpoints). The array
   * sent IS the resulting active set: existing rows matched by normalized
   * reference are updated, rows missing from the array are soft-deleted,
   * new references are inserted. `[]` clears all configured participants.
   * `409 MSP_PARTICIPANT_DUPLICATE_REFERENCE` / `422
   * MSP_PARTICIPANT_SUM_EXCEEDS_ESTIMATED` / `422
   * MSP_PARTICIPANT_AMOUNT_NOT_POSITIVE`.
   */
  replaceParticipants(
    monthlyServiceId: string,
    participants: MonthlyServiceParticipantRowInput[],
  ): Promise<MonthlyServiceParticipant[]> {
    return httpClient.put<MonthlyServiceParticipant[]>(
      `/monthly-services/${monthlyServiceId}/participants`,
      { participants },
    );
  },
};
