import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type CreateHabitInput,
  type HabitLogInput,
  type UpdateHabitInput,
} from '@/core/domain/schemas/habit.schema';

import { habitsApi } from '@/infrastructure/api/habits.api';

export const habitKeys = {
  all: ['habits'] as const,
  lists: () => [...habitKeys.all, 'list'] as const,
  list: (includeArchived?: boolean) => [...habitKeys.lists(), { includeArchived }] as const,
  daily: () => [...habitKeys.all, 'daily'] as const,
  details: () => [...habitKeys.all, 'detail'] as const,
  detail: (id: string) => [...habitKeys.details(), id] as const,
  logs: (id: string) => [...habitKeys.all, 'logs', id] as const,
  logList: (id: string, filters?: object) => [...habitKeys.logs(id), filters] as const,
};

export function useHabits(includeArchived = false) {
  return useQuery({
    queryKey: habitKeys.list(includeArchived),
    queryFn: () => habitsApi.getAll(includeArchived),
  });
}

export function useDailyHabits() {
  return useQuery({
    queryKey: habitKeys.daily(),
    queryFn: () => habitsApi.getDaily(),
  });
}

export function useHabit(id: string) {
  return useQuery({
    queryKey: habitKeys.detail(id),
    queryFn: () => habitsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateHabitInput) => habitsApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: habitKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: habitKeys.daily() });
    },
  });
}

export function useUpdateHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateHabitInput }) =>
      habitsApi.update(id, data),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: habitKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: habitKeys.daily() });
      void queryClient.invalidateQueries({ queryKey: habitKeys.detail(id) });
    },
  });
}

export function useArchiveHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => habitsApi.toggleArchive(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: habitKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: habitKeys.daily() });
    },
  });
}

export function useDeleteHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => habitsApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: habitKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: habitKeys.daily() });
    },
  });
}

export function useLogHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ habitId, data }: { habitId: string; data: HabitLogInput }) =>
      habitsApi.createLog(habitId, data),
    onSuccess: (_, { habitId }) => {
      void queryClient.invalidateQueries({ queryKey: habitKeys.daily() });
      void queryClient.invalidateQueries({ queryKey: habitKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: habitKeys.detail(habitId) });
      void queryClient.invalidateQueries({ queryKey: habitKeys.logs(habitId) });
    },
  });
}

interface HabitLogFilters {
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export function useHabitLogs(habitId: string, filters?: HabitLogFilters) {
  return useQuery({
    queryKey: habitKeys.logList(habitId, filters),
    queryFn: () => habitsApi.getLogs(habitId, filters),
    enabled: !!habitId,
  });
}
