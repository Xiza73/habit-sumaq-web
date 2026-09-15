import { type Habit, type HabitLog, type HabitWithStats } from '@/core/domain/entities/habit';
import {
  type CreateHabitInput,
  type HabitLogInput,
  type UpdateHabitInput,
} from '@/core/domain/schemas/habit.schema';

import { httpClient, type PaginatedResponse } from './http-client';

interface HabitLogFilters {
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export const habitsApi = {
  getAll(includeArchived = false): Promise<HabitWithStats[]> {
    const query = includeArchived ? '?includeArchived=true' : '';
    return httpClient.get<HabitWithStats[]>(`/habits${query}`);
  },

  getDaily(date?: string): Promise<HabitWithStats[]> {
    const query = date ? `?date=${date}` : '';
    return httpClient.get<HabitWithStats[]>(`/habits/daily${query}`);
  },

  getById(id: string): Promise<HabitWithStats> {
    return httpClient.get<HabitWithStats>(`/habits/${id}`);
  },

  create(data: CreateHabitInput): Promise<Habit> {
    return httpClient.post<Habit>('/habits', data);
  },

  update(id: string, data: UpdateHabitInput): Promise<Habit> {
    return httpClient.patch<Habit>(`/habits/${id}`, data);
  },

  toggleArchive(id: string): Promise<Habit> {
    return httpClient.patch<Habit>(`/habits/${id}/archive`);
  },

  delete(id: string): Promise<void> {
    return httpClient.delete<void>(`/habits/${id}`);
  },

  /**
   * Spends one streak shield on the period this habit just missed. No body —
   * the backend decides which period is rescuable, so the client cannot ask
   * for the wrong one.
   *
   * Rejects with HAB_007 (no shields) or HAB_008 (nothing to rescue). Both are
   * 409s: state, not validation.
   */
  rescueStreak(habitId: string): Promise<{ rescuedDate: string }> {
    return httpClient.post<{ rescuedDate: string }>(`/habits/${habitId}/rescue-streak`, {});
  },

  /**
   * Gives back the shield spent on `date` and drops the rescue, so the period
   * can be logged for real.
   *
   * `date` can be any day of a rescued WEEKLY period — the backend resolves it
   * to the stored Monday and echoes that back as `releasedDate`.
   *
   * `shieldReturned` is false when the stock was already at the cap: the
   * rescue is released either way, but the shield is gone. Warn BEFORE
   * confirming, not after.
   *
   * Rejects with HAB_009 when no rescue covers that period.
   */
  releaseRescue(
    habitId: string,
    date: string,
  ): Promise<{ releasedDate: string; shieldReturned: boolean }> {
    return httpClient.delete<{ releasedDate: string; shieldReturned: boolean }>(
      `/habits/${habitId}/rescue-streak/${date}`,
    );
  },

  createLog(habitId: string, data: HabitLogInput): Promise<HabitLog> {
    return httpClient.post<HabitLog>(`/habits/${habitId}/logs`, data);
  },

  getLogs(habitId: string, filters?: HabitLogFilters): Promise<PaginatedResponse<HabitLog[]>> {
    const params = new URLSearchParams();
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.set('dateTo', filters.dateTo);
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.limit) params.set('limit', String(filters.limit));
    const query = params.toString() ? `?${params.toString()}` : '';
    return httpClient.getWithMeta<HabitLog[]>(`/habits/${habitId}/logs${query}`);
  },
};
