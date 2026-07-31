import { type MonthlyService } from '@/core/domain/entities/monthly-service';
import { type MonthlyServiceParticipant } from '@/core/domain/entities/monthly-service-participant';
import {
  type CreateMonthlyServiceInput,
  type UpdateMonthlyServiceInput,
} from '@/core/domain/schemas/monthly-service.schema';
import {
  type AddMonthlyServiceParticipantInput,
  type UpdateMonthlyServiceParticipantInput,
} from '@/core/domain/schemas/monthly-service-participant.schema';

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
   * Adds a participant to the service's config.
   * `409 MSP_PARTICIPANT_DUPLICATE_REFERENCE` / `422
   * MSP_PARTICIPANT_SUM_EXCEEDS_ESTIMATED` / `422
   * MSP_PARTICIPANT_AMOUNT_NOT_POSITIVE`.
   */
  addParticipant(
    monthlyServiceId: string,
    data: AddMonthlyServiceParticipantInput,
  ): Promise<MonthlyServiceParticipant> {
    return httpClient.post<MonthlyServiceParticipant>(
      `/monthly-services/${monthlyServiceId}/participants`,
      data,
    );
  },

  /** Edits a participant's `defaultAmount`. Same error codes as `addParticipant`. */
  updateParticipant(
    monthlyServiceId: string,
    participantId: string,
    data: UpdateMonthlyServiceParticipantInput,
  ): Promise<MonthlyServiceParticipant> {
    return httpClient.patch<MonthlyServiceParticipant>(
      `/monthly-services/${monthlyServiceId}/participants/${participantId}`,
      data,
    );
  },

  /** Soft-deletes a participant. `404 MSP_PARTICIPANT_NOT_FOUND`. */
  removeParticipant(monthlyServiceId: string, participantId: string): Promise<void> {
    return httpClient.delete<void>(
      `/monthly-services/${monthlyServiceId}/participants/${participantId}`,
    );
  },
};
