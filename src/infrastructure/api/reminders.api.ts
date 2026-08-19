import { type Reminder } from '@/core/domain/entities/reminder';
import {
  type CreateReminderInput,
  type UpdateReminderInput,
} from '@/core/domain/schemas/reminder.schema';

import { httpClient } from './http-client';

export const remindersApi = {
  getAll(): Promise<Reminder[]> {
    return httpClient.get<Reminder[]>('/reminders');
  },

  create(data: CreateReminderInput): Promise<Reminder> {
    return httpClient.post<Reminder>('/reminders', data);
  },

  update(id: string, data: UpdateReminderInput): Promise<Reminder> {
    return httpClient.patch<Reminder>(`/reminders/${id}`, data);
  },

  delete(id: string): Promise<void> {
    return httpClient.delete<void>(`/reminders/${id}`);
  },
};
