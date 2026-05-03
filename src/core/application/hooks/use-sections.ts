import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type Section } from '@/core/domain/entities/section';
import {
  type CreateSectionInput,
  type ReorderSectionsInput,
  type UpdateSectionInput,
} from '@/core/domain/schemas/section.schema';

import { sectionsApi } from '@/infrastructure/api/sections.api';

import { tasksKeys } from './use-tasks';

export const sectionsKeys = {
  all: ['sections'] as const,
  list: () => [...sectionsKeys.all, 'list'] as const,
};

export function useSections() {
  return useQuery({
    queryKey: sectionsKeys.list(),
    queryFn: () => sectionsApi.getAll(),
  });
}

export function useCreateSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSectionInput) => sectionsApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sectionsKeys.all });
    },
  });
}

export function useUpdateSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSectionInput }) =>
      sectionsApi.update(id, data),
    // Optimistic: patch the cached section so changes (e.g. collapse toggle)
    // feel instant. Most callers care about the toggle latency more than
    // anything else — name/color edits land while the user is still in
    // the form and the list refetch is fast enough either way.
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: sectionsKeys.list() });
      const previous = queryClient.getQueryData<Section[]>(sectionsKeys.list());

      if (previous) {
        queryClient.setQueryData<Section[]>(
          sectionsKeys.list(),
          previous.map((section) => (section.id === id ? { ...section, ...data } : section)),
        );
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(sectionsKeys.list(), context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: sectionsKeys.all });
    },
  });
}

/**
 * Cascade delete — also wipes tasks belonging to this section. Invalidates
 * both `sections` and `tasks` caches so the dashboard re-renders without
 * orphan rows.
 */
export function useDeleteSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sectionsApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sectionsKeys.all });
      void queryClient.invalidateQueries({ queryKey: tasksKeys.all });
    },
  });
}

export function useReorderSections() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ReorderSectionsInput) => sectionsApi.reorder(data),
    // Optimistic: reorder the cached list so DnD feels instant.
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: sectionsKeys.list() });
      const previous = queryClient.getQueryData<Section[]>(sectionsKeys.list());

      if (previous) {
        const byId = new Map(previous.map((s) => [s.id, s]));
        const reordered = data.orderedIds
          .map((id, index) => {
            const section = byId.get(id);
            return section ? { ...section, position: index + 1 } : null;
          })
          .filter((s): s is Section => s !== null);
        // Sections not in the payload (shouldn't happen for full reorders, but
        // be defensive) keep their original positions, listed afterwards.
        const missing = previous.filter((s) => !data.orderedIds.includes(s.id));
        queryClient.setQueryData<Section[]>(sectionsKeys.list(), [...reordered, ...missing]);
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(sectionsKeys.list(), context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: sectionsKeys.all });
    },
  });
}
