import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type QuickTask } from '@/core/domain/entities/quick-task';
import {
  type CreateQuickTaskInput,
  type ReorderQuickTasksInput,
  type UpdateQuickTaskInput,
} from '@/core/domain/schemas/quick-task.schema';

import { quickTasksApi } from '@/infrastructure/api/quick-tasks.api';

export const quickTasksKeys = {
  all: ['quick-tasks'] as const,
  list: () => [...quickTasksKeys.all, 'list'] as const,
};

export function useQuickTasks() {
  return useQuery({
    queryKey: quickTasksKeys.list(),
    queryFn: () => quickTasksApi.getAll(),
  });
}

export function useCreateQuickTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateQuickTaskInput) => quickTasksApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: quickTasksKeys.all });
    },
  });
}

export function useUpdateQuickTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateQuickTaskInput }) =>
      quickTasksApi.update(id, data),

    // Optimistic toggle for `completed` so the checkbox feels instant and the
    // card moves between "pending" and "completed" sections without waiting
    // for the round trip.
    onMutate: async ({ id, data }) => {
      if (data.completed === undefined) return;

      await queryClient.cancelQueries({ queryKey: quickTasksKeys.list() });
      const previous = queryClient.getQueryData<QuickTask[]>(quickTasksKeys.list());

      if (previous) {
        queryClient.setQueryData<QuickTask[]>(quickTasksKeys.list(), (old) =>
          old?.map((task) =>
            task.id === id
              ? {
                  ...task,
                  completed: data.completed ?? task.completed,
                  completedAt: data.completed ? new Date().toISOString() : null,
                }
              : task,
          ),
        );
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(quickTasksKeys.list(), context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: quickTasksKeys.all });
    },
  });
}

export function useDeleteQuickTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => quickTasksApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: quickTasksKeys.all });
    },
  });
}

export function useReorderQuickTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReorderQuickTasksInput) => quickTasksApi.reorder(data),

    // Optimistic: reorder the cached list so DnD feels instant.
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: quickTasksKeys.list() });
      const previous = queryClient.getQueryData<QuickTask[]>(quickTasksKeys.list());

      if (previous) {
        const byId = new Map(previous.map((t) => [t.id, t]));
        const reordered = data.orderedIds
          .map((id, index) => {
            const task = byId.get(id);
            return task ? { ...task, position: index + 1 } : null;
          })
          .filter((t): t is QuickTask => t !== null);

        // Keep tasks not listed in `orderedIds` at the end (e.g. completed ones
        // that aren't part of the drag-and-drop set).
        const missing = previous.filter((t) => !data.orderedIds.includes(t.id));
        queryClient.setQueryData<QuickTask[]>(quickTasksKeys.list(), [...reordered, ...missing]);
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(quickTasksKeys.list(), context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: quickTasksKeys.all });
    },
  });
}
