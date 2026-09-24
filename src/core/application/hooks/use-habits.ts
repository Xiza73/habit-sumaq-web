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

import { analytics } from '@/lib/analytics';
import { fireCelebrationConfetti } from '@/lib/confetti';
import { getTodayLocaleDate } from '@/lib/format';
import { detectMilestoneCrossed } from '@/lib/streak-milestones';

import { useCelebrationStore } from '../stores/celebration.store';

import { alertKeys } from './use-alerts';
import { notifyHabitsChanged } from './use-habits-window-sync';
import { userSettingsKeys } from './use-user-settings';

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
      notifyHabitsChanged();
      void queryClient.invalidateQueries({ queryKey: alertKeys.lists() });
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
      notifyHabitsChanged();
      void queryClient.invalidateQueries({ queryKey: habitKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: alertKeys.lists() });
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
      notifyHabitsChanged();
      void queryClient.invalidateQueries({ queryKey: alertKeys.lists() });
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
      notifyHabitsChanged();
      void queryClient.invalidateQueries({ queryKey: alertKeys.lists() });
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

/**
 * Spends a streak shield on the period a habit just missed.
 *
 * Invalidates habits AND user settings: the streak changes, and so does the
 * shield count the rescue button reads. Invalidating only the first would
 * leave the button offering a shield that is already gone.
 */
export function useRescueStreak() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (habitId: string) => habitsApi.rescueStreak(habitId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: habitKeys.all });
      notifyHabitsChanged();
      void queryClient.invalidateQueries({ queryKey: userSettingsKeys.all });
    },
  });
}

/**
 * Drops the rescue covering a period and takes the shield back, so the day can
 * be logged for real.
 *
 * Invalidates settings alongside habits for the same reason `useRescueStreak`
 * does: the shield stock moved, and the rescue button elsewhere on the page
 * reads it. Leaving it stale shows a count the server no longer agrees with.
 */
export function useReleaseRescue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ habitId, date }: { habitId: string; date: string }) =>
      habitsApi.releaseRescue(habitId, date),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: habitKeys.all });
      notifyHabitsChanged();
      void queryClient.invalidateQueries({ queryKey: userSettingsKeys.all });
    },
  });
}

/**
 * How a habit looks the instant a log is sent, before the server answers.
 *
 * Extracted because the SAME patch has to land on two cached queries: the
 * day's list and the habit's detail. Only the list was being patched, so the
 * floating window and the detail page — both of which read the detail — sat
 * on the old count until the refetch came back, and the check-in felt laggy
 * in exactly the places the list did not.
 *
 * Inlining it twice is how the two end up disagreeing about the same habit.
 */
function applyOptimisticLog(habit: HabitWithStats, data: HabitLogInput): HabitWithStats {
  // Mirrors the server's resolution order: an explicit target for this call,
  // else the day's existing one, else the habit default. Measuring against
  // `habit.targetCount` here would make the optimistic row disagree with the
  // row that comes back.
  const target = data.targetCount ?? habit.todayLog?.targetCount ?? habit.periodTarget;
  // The server caps the count at the target, so lowering a day's target
  // truncates its count. Cap here too, or the row flashes an impossible
  // "6/4" until the refetch lands.
  const newCount = Math.min(data.count, target);
  const completed = newCount >= target;

  return {
    ...habit,
    periodCount: habit.periodCount - (habit.todayLog?.count ?? 0) + newCount,
    periodCompleted: completed,
    periodTarget: target,
    todayLog: habit.todayLog
      ? { ...habit.todayLog, count: newCount, completed, targetCount: target }
      : {
          id: 'optimistic',
          habitId: habit.id,
          date: data.date,
          count: newCount,
          completed,
          targetCount: target,
          note: data.note ?? null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
  };
}

export function useLogHabit() {
  const queryClient = useQueryClient();
  const t = useTranslations('habits.milestones');
  const tShare = useTranslations('habits.streakCard');

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
          old?.map((habit) => (habit.id === habitId ? applyOptimisticLog(habit, data) : habit)),
        );
      }

      // The detail query is what the floating window and the habit page read,
      // and it was left untouched — hence the lag there while the list felt
      // instant.
      //
      // Only when the log is for TODAY: the detail's `todayLog` means today,
      // and `HabitList` can log any past date from its picker. Patching it on
      // a back-fill would put yesterday's count on today's card.
      const detailKey = habitKeys.detail(habitId);
      const previousDetail =
        data.date === getTodayLocaleDate()
          ? queryClient.getQueryData<HabitWithStats>(detailKey)
          : undefined;

      if (previousDetail) {
        await queryClient.cancelQueries({ queryKey: detailKey });
        queryClient.setQueryData<HabitWithStats>(
          detailKey,
          applyOptimisticLog(previousDetail, data),
        );
      }

      return { previousDaily, dailyKey, previousDetail, detailKey, prevStreak, habitName };
    },
    onError: (_, __, context) => {
      if (context?.previousDaily) {
        queryClient.setQueryData(context.dailyKey, context.previousDaily);
      }
      // Both patches roll back, or the window keeps showing a count the
      // request never managed to save.
      if (context?.previousDetail) {
        queryClient.setQueryData(context.detailKey, context.previousDetail);
      }
    },
    onSuccess: async (_, { habitId, data }, context) => {
      analytics.habitLogged();
      // Refetch the sources that carry the backend-computed `currentStreak`
      // so the cache is in sync before we detect the milestone. We target
      // the specific date + habit to avoid a broad network burst.
      // `refetchQueries` is a no-op for queries that aren't cached, so this
      // works whether the caller is HabitList (daily) or HabitDetail (detail).
      await Promise.all([
        queryClient.refetchQueries({ queryKey: habitKeys.daily(data.date) }),
        queryClient.refetchQueries({ queryKey: habitKeys.detail(habitId) }),
      ]);

      // A milestone celebrates reaching a streak TODAY — not discovering one
      // while back-filling. `HabitList` logs whatever date its picker holds,
      // so filling in a day you forgot can push `currentStreak` past a
      // milestone: the number is real, but the moment is not, and a modal
      // congratulating you for a Tuesday you just remembered reads as a bug.
      //
      // Comparing against today also covers both frequencies without a
      // per-frequency branch. A DAILY habit's occurrence IS today; a WEEKLY
      // one can be logged any day of its week, and the day the user actually
      // closes it out is the day worth celebrating. Logging an earlier day of
      // the current week stays silent, which is the conservative side to err
      // on — the share button on HabitDetail is still there for it.
      //
      // Deliberately placed after the refetch above: the cache still has to
      // end up correct for a back-filled day, only the celebration is gated.
      if (data.date !== getTodayLocaleDate()) return;

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

      const habitColor =
        queryClient
          .getQueryData<HabitWithStats[]>(habitKeys.daily(data.date))
          ?.find((h) => h.id === habitId)?.color ?? null;

      // Toast with a "Share now" action on every milestone:
      //   - For week, this is the ONLY way to open the share modal
      //     (the auto-modal is intentionally month+ only, to avoid
      //     weekly noise).
      //   - For month/century, the auto-modal already opens; the
      //     action acts as a safety net in case the user dismissed the
      //     modal too fast and wants to reopen it from the toast.
      // Duration bumped to 10s so the user has time to register the
      // milestone, read the message, and decide whether to share.
      toast.success(message, {
        duration: 10_000,
        action: {
          label: tShare('shareNow'),
          onClick: () => {
            useCelebrationStore.getState().trigger({
              habitId,
              habitName,
              days: newStreak,
              color: habitColor,
            });
          },
        },
      });
      fireCelebrationConfetti();

      // For BIG milestones (month + century), also pop the modal
      // automatically. The toast action above lets the user re-open it
      // if they dismissed it.
      if (milestone.kind !== 'week') {
        useCelebrationStore.getState().trigger({
          habitId,
          habitName,
          days: newStreak,
          color: habitColor,
        });
      }
    },
    onSettled: (_, __, { habitId }) => {
      // daily + detail are already refetched in onSuccess; invalidate the
      // rest here so they refetch on next access.
      void queryClient.invalidateQueries({ queryKey: habitKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: habitKeys.logs(habitId) });
      notifyHabitsChanged();
      // Logging a habit can resolve the `habits-midday` alert (when it was
      // the last unlogged DAILY for today). Invalidate so the bell drops.
      void queryClient.invalidateQueries({ queryKey: alertKeys.lists() });
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
