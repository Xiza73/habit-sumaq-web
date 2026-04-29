import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type CreateChoreInput,
  type MarkChoreDoneInput,
  type UpdateChoreInput,
} from '@/core/domain/schemas/chore.schema';

import { choresApi } from '@/infrastructure/api/chores.api';

export const choreKeys = {
  all: ['chores'] as const,
  lists: () => [...choreKeys.all, 'list'] as const,
  list: (includeArchived?: boolean) => [...choreKeys.lists(), { includeArchived }] as const,
  details: () => [...choreKeys.all, 'detail'] as const,
  detail: (id: string) => [...choreKeys.details(), id] as const,
  logs: (id: string) => [...choreKeys.all, 'logs', id] as const,
  logsPage: (id: string, limit: number, offset: number) =>
    [...choreKeys.logs(id), { limit, offset }] as const,
};

export function useChores(includeArchived = false) {
  return useQuery({
    queryKey: choreKeys.list(includeArchived),
    queryFn: () => choresApi.getAll(includeArchived),
  });
}

export function useChore(id: string) {
  return useQuery({
    queryKey: choreKeys.detail(id),
    queryFn: () => choresApi.getById(id),
    enabled: !!id,
  });
}

export function useChoreLogs(
  choreId: string,
  params: { limit: number; offset: number },
  enabled = true,
) {
  return useQuery({
    queryKey: choreKeys.logsPage(choreId, params.limit, params.offset),
    queryFn: () => choresApi.getLogs(choreId, params),
    enabled: !!choreId && enabled,
  });
}

export function useCreateChore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateChoreInput) => choresApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: choreKeys.lists() });
    },
  });
}

export function useUpdateChore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateChoreInput }) =>
      choresApi.update(id, data),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: choreKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: choreKeys.detail(id) });
    },
  });
}

/**
 * Marks the chore done. Invalidates the list (so `nextDueDate` /
 * `lastDoneDate` refresh) and the chore's logs cache (so the history modal
 * picks up the new entry without a manual refetch).
 */
export function useMarkChoreDone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MarkChoreDoneInput }) =>
      choresApi.markDone(id, data),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: choreKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: choreKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: choreKeys.logs(id) });
    },
  });
}

export function useSkipChoreCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => choresApi.skip(id),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: choreKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: choreKeys.detail(id) });
    },
  });
}

export function useArchiveChore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => choresApi.toggleArchive(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: choreKeys.lists() });
    },
  });
}

export function useDeleteChore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => choresApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: choreKeys.lists() });
    },
  });
}
