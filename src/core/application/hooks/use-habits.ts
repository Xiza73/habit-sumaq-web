import { useTranslations } from 'next-intl';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { type HabitWithStats } from '@/core/domain/entities/habit';
import {
  type CreateHabitInput,
  type HabitLogInput,
  type UpdateHabitInput,
} from '@/core/domain/schemas/habit.schema';

import { habitsApi } from '@/infrastructure/api/habits.api';

import { fireCelebrationConfetti } from '@/lib/confetti';
import { detectMilestoneCrossed } from '@/lib/streak-milestones';

export const habitKeys = {
  all: ['habits'] as const,
  lists: () => [...habitKeys.all, 'list'] as const,
  list: (includeArchived?: boolean) => [...habitKeys.lists(), { includeArchived }] as const,
  dailyAll: () => [...habitKeys.all, 'daily'] as const,
  daily: (date?: string) => [...habitKeys.dailyAll(), date] as const,
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

export function useDailyHabits(date?: string) {
  return useQuery({
    queryKey: habitKeys.daily(date),
    queryFn: () => habitsApi.getDaily(date),
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
      void queryClient.invalidateQueries({ queryKey: habitKeys.dailyAll() });
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
      void queryClient.invalidateQueries({ queryKey: habitKeys.dailyAll() });
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
      void queryClient.invalidateQueries({ queryKey: habitKeys.dailyAll() });
    },
  });
}

export function useDeleteHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => habitsApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: habitKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: habitKeys.dailyAll() });
    },
  });
}

/**
 * Reads the best-available `currentStreak` for a habit from the TanStack
 * Query cache, preferring the sources we know are kept in sync with the
 * backend: daily → detail → any list. Returns `null` if nothing is cached.
 */
function readStreakFromCache(
  queryClient: ReturnType<typeof useQueryClient>,
  habitId: string,
  date: string,
): number | null {
  // Daily is the one we refetch after a log — freshest source on success.
  const daily = queryClient.getQueryData<HabitWithStats[]>(habitKeys.daily(date));
  const fromDaily = daily?.find((h) => h.id === habitId);
  if (fromDaily) return fromDaily.currentStreak;

  const detail = queryClient.getQueryData<HabitWithStats>(habitKeys.detail(habitId));
  if (detail) return detail.currentStreak;

  const allLists = queryClient.getQueriesData<HabitWithStats[]>({ queryKey: habitKeys.lists() });
  for (const [, list] of allLists) {
    const match = list?.find((h) => h.id === habitId);
    if (match) return match.currentStreak;
  }

  return null;
}

export function useLogHabit() {
  const queryClient = useQueryClient();
  const t = useTranslations('habits.milestones');

  return useMutation({
    mutationFn: ({ habitId, data }: { habitId: string; data: HabitLogInput }) =>
      habitsApi.createLog(habitId, data),
    onMutate: async ({ habitId, data }) => {
      await queryClient.cancelQueries({ queryKey: habitKeys.dailyAll() });

      const dailyKey = habitKeys.daily(data.date);
      const previousDaily = queryClient.getQueryData<HabitWithStats[]>(dailyKey);

      // Streak BEFORE the mutation — backend is the source of truth so we
      // read the cached value (which the backend populated on last fetch),
      // not any optimistic one. Used to detect milestone crossings in onSuccess.
      const prevStreak = readStreakFromCache(queryClient, habitId, data.date);

      // Grab the habit name up-front in case the object is replaced by the
      // time we want to show the toast.
      const habitName = previousDaily?.find((h) => h.id === habitId)?.name ?? '';

      if (previousDaily) {
        queryClient.setQueryData<HabitWithStats[]>(dailyKey, (old) =>
          old?.map((habit) => {
            if (habit.id !== habitId) return habit;

            const newCount = data.count;
            const completed = newCount >= habit.targetCount;

            return {
              ...habit,
              periodCount: habit.periodCount - (habit.todayLog?.count ?? 0) + newCount,
              periodCompleted: completed,
              todayLog: habit.todayLog
                ? { ...habit.todayLog, count: newCount, completed }
                : {
                    id: 'optimistic',
                    habitId,
                    date: data.date,
                    count: newCount,
                    completed,
                    note: data.note ?? null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
            };
          }),
        );
      }

      return { previousDaily, dailyKey, prevStreak, habitName };
    },
    onError: (_, __, context) => {
      if (context?.previousDaily) {
        queryClient.setQueryData(context.dailyKey, context.previousDaily);
      }
    },
    onSuccess: async (_, { habitId, data }, context) => {
      // Refetch the sources that carry the backend-computed `currentStreak`
      // so the cache is in sync before we detect the milestone. We target
      // the specific date + habit to avoid a broad network burst.
      // `refetchQueries` is a no-op for queries that aren't cached, so this
      // works whether the caller is HabitList (daily) or HabitDetail (detail).
      await Promise.all([
        queryClient.refetchQueries({ queryKey: habitKeys.daily(data.date) }),
        queryClient.refetchQueries({ queryKey: habitKeys.detail(habitId) }),
      ]);

      const prevStreak = context?.prevStreak ?? null;
      const newStreak = readStreakFromCache(queryClient, habitId, data.date);

      if (prevStreak === null || newStreak === null) return;

      const milestone = detectMilestoneCrossed(prevStreak, newStreak);
      if (!milestone) return;

      const habitName =
        queryClient
          .getQueryData<HabitWithStats[]>(habitKeys.daily(data.date))
          ?.find((h) => h.id === habitId)?.name ??
        context?.habitName ??
        '';

      const message =
        milestone.kind === 'century'
          ? t('century', { name: habitName, days: milestone.days })
          : t(milestone.kind, { name: habitName });

      toast.success(message, { duration: 6000 });
      fireCelebrationConfetti();
    },
    onSettled: (_, __, { habitId }) => {
      // daily + detail are already refetched in onSuccess; invalidate the
      // rest here so they refetch on next access.
      void queryClient.invalidateQueries({ queryKey: habitKeys.lists() });
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
