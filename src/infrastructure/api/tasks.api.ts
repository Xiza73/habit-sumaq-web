import { type Task } from '@/core/domain/entities/task';
import {
  type CreateTaskInput,
  type ReorderTasksInput,
  type UpdateTaskInput,
} from '@/core/domain/schemas/task.schema';

import { httpClient } from './http-client';

export const tasksApi = {
  getAll(): Promise<Task[]> {
    return httpClient.get<Task[]>('/tasks');
  },

  create(data: CreateTaskInput): Promise<Task> {
    return httpClient.post<Task>('/tasks', data);
  },

  update(id: string, data: UpdateTaskInput): Promise<Task> {
    return httpClient.patch<Task>(`/tasks/${id}`, data);
  },

  delete(id: string): Promise<void> {
    return httpClient.delete<void>(`/tasks/${id}`);
  },

  reorder(data: ReorderTasksInput): Promise<void> {
    return httpClient.patch<void>('/tasks/reorder', data);
  },
};
