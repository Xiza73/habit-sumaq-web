import { type Section } from '@/core/domain/entities/section';
import {
  type CreateSectionInput,
  type ReorderSectionsInput,
  type UpdateSectionInput,
} from '@/core/domain/schemas/section.schema';

import { httpClient } from './http-client';

export const sectionsApi = {
  getAll(): Promise<Section[]> {
    return httpClient.get<Section[]>('/tasks/sections');
  },

  create(data: CreateSectionInput): Promise<Section> {
    return httpClient.post<Section>('/tasks/sections', data);
  },

  update(id: string, data: UpdateSectionInput): Promise<Section> {
    return httpClient.patch<Section>(`/tasks/sections/${id}`, data);
  },

  /**
   * Cascade delete — backend drops the section AND all its tasks via
   * `ON DELETE CASCADE`. Caller is responsible for confirming with the user.
   */
  delete(id: string): Promise<void> {
    return httpClient.delete<void>(`/tasks/sections/${id}`);
  },

  reorder(data: ReorderSectionsInput): Promise<void> {
    return httpClient.patch<void>('/tasks/sections/reorder', data);
  },
};
