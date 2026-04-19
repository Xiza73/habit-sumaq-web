import { type QuickTask } from '@/core/domain/entities/quick-task';
import {
  type CreateQuickTaskInput,
  type ReorderQuickTasksInput,
  type UpdateQuickTaskInput,
} from '@/core/domain/schemas/quick-task.schema';

import { httpClient } from './http-client';

export const quickTasksApi = {
  getAll(): Promise<QuickTask[]> {
    return httpClient.get<QuickTask[]>('/quick-tasks');
  },

  create(data: CreateQuickTaskInput): Promise<QuickTask> {
    return httpClient.post<QuickTask>('/quick-tasks', data);
  },

  update(id: string, data: UpdateQuickTaskInput): Promise<QuickTask> {
    return httpClient.patch<QuickTask>(`/quick-tasks/${id}`, data);
  },

  delete(id: string): Promise<void> {
    return httpClient.delete<void>(`/quick-tasks/${id}`);
  },

  reorder(data: ReorderQuickTasksInput): Promise<void> {
    return httpClient.patch<void>('/quick-tasks/reorder', data);
  },
};
