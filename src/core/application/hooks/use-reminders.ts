import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type Reminder } from '@/core/domain/entities/reminder';
import {
  type CreateReminderInput,
  type UpdateReminderInput,
} from '@/core/domain/schemas/reminder.schema';

import { remindersApi } from '@/infrastructure/api/reminders.api';

import { alertKeys } from './use-alerts';

export const remindersKeys = {
  all: ['reminders'] as const,
  list: () => [...remindersKeys.all, 'list'] as const,
};

export function useReminders() {
  return useQuery({
    queryKey: remindersKeys.list(),
    queryFn: () => remindersApi.getAll(),
  });
}

export function useCreateReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReminderInput) => remindersApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: remindersKeys.all });
      // A reminder created for today (or earlier) is due the moment it exists.
      void queryClient.invalidateQueries({ queryKey: alertKeys.lists() });
    },
  });
}

export function useUpdateReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateReminderInput }) =>
      remindersApi.update(id, data),

    // Optimistic toggle so the checkbox feels instant and the row moves
    // between buckets without waiting for the round trip.
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: remindersKeys.list() });
      const previous = queryClient.getQueryData<Reminder[]>(remindersKeys.list());

      if (previous && data.completed !== undefined) {
        queryClient.setQueryData<Reminder[]>(remindersKeys.list(), (old) =>
          old?.map((r) =>
            r.id === id
              ? {
                  ...r,
                  completed: data.completed!,
                  completedAt: data.completed! ? new Date().toISOString() : null,
                }
              : r,
          ),
        );
      }

      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(remindersKeys.list(), context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: remindersKeys.all });
      // Completing a reminder resolves its alert; changing its date can create
      // or clear one.
      void queryClient.invalidateQueries({ queryKey: alertKeys.lists() });
    },
  });
}

export function useDeleteReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => remindersApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: remindersKeys.all });
      void queryClient.invalidateQueries({ queryKey: alertKeys.lists() });
    },
  });
}
