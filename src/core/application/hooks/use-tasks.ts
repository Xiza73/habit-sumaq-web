import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type Task } from '@/core/domain/entities/task';
import {
  type CreateTaskInput,
  type ReorderTasksInput,
  type UpdateTaskInput,
} from '@/core/domain/schemas/task.schema';

import { tasksApi } from '@/infrastructure/api/tasks.api';

export const tasksKeys = {
  all: ['tasks'] as const,
  list: () => [...tasksKeys.all, 'list'] as const,
};

export function useTasks() {
  return useQuery({
    queryKey: tasksKeys.list(),
    queryFn: () => tasksApi.getAll(),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTaskInput) => tasksApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tasksKeys.all });
    },
  });
}

/**
 * Optimistic toggle for `completed` so the checkbox feels instant. Other
 * field updates (title, description, sectionId) wait for the round trip
 * since they don't have a "lights up immediately" UX expectation.
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskInput }) => tasksApi.update(id, data),

    onMutate: async ({ id, data }) => {
      if (data.completed === undefined) return;

      await queryClient.cancelQueries({ queryKey: tasksKeys.list() });
      const previous = queryClient.getQueryData<Task[]>(tasksKeys.list());

      if (previous) {
        queryClient.setQueryData<Task[]>(tasksKeys.list(), (old) =>
          old?.map((t) =>
            t.id === id
              ? {
                  ...t,
                  completed: data.completed ?? t.completed,
                  completedAt: data.completed ? new Date().toISOString() : null,
                }
              : t,
          ),
        );
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(tasksKeys.list(), context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: tasksKeys.all });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: tasksKeys.list() });
      const previous = queryClient.getQueryData<Task[]>(tasksKeys.list());

      if (previous) {
        queryClient.setQueryData<Task[]>(tasksKeys.list(), (old) =>
          old?.filter((t) => t.id !== id),
        );
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(tasksKeys.list(), context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: tasksKeys.all });
    },
  });
}

/**
 * Reorder within a single section. Optimistic update reorders the cached
 * list so DnD feels instant; rollback on error from `previous`.
 */
export function useReorderTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReorderTasksInput) => tasksApi.reorder(data),

    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: tasksKeys.list() });
      const previous = queryClient.getQueryData<Task[]>(tasksKeys.list());

      if (previous) {
        const byId = new Map(previous.map((t) => [t.id, t]));
        const reorderedIds = new Set(data.orderedIds);
        const reordered = data.orderedIds
          .map((id, index) => {
            const task = byId.get(id);
            return task ? { ...task, position: index + 1 } : null;
          })
          .filter((t): t is Task => t !== null);
        // Tasks outside the reorder set keep their original ordering.
        const others = previous.filter((t) => !reorderedIds.has(t.id));
        queryClient.setQueryData<Task[]>(tasksKeys.list(), [...others, ...reordered]);
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(tasksKeys.list(), context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: tasksKeys.all });
    },
  });
}
