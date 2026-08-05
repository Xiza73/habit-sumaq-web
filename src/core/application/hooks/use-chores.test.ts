import { createElement, type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Chore } from '@/core/domain/entities/chore';

import { choresApi } from '@/infrastructure/api/chores.api';
import { httpClient } from '@/infrastructure/api/http-client';

import { alertKeys } from './use-alerts';
import { choreKeys, useRevertLastChoreDone } from './use-chores';

vi.mock('@/infrastructure/api/http-client', () => ({
  httpClient: {
    post: vi.fn(),
  },
}));

function makeChore(overrides: Partial<Chore> = {}): Chore {
  return {
    id: 'chore-1',
    userId: 'user-1',
    name: 'Cortar el pelo',
    notes: null,
    category: null,
    intervalValue: 6,
    intervalUnit: 'weeks',
    startDate: '2026-01-01',
    lastDoneDate: '2026-03-01',
    nextDueDate: '2026-04-12',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    isOverdue: false,
    ...overrides,
  };
}

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return { Wrapper, invalidateSpy };
}

describe('choresApi.revertLastDone', () => {
  beforeEach(() => {
    vi.mocked(httpClient.post).mockReset();
  });

  it('POSTs to /chores/:id/revert-last-done', async () => {
    const postMock = vi.mocked(httpClient.post);
    postMock.mockResolvedValueOnce(makeChore());

    await choresApi.revertLastDone('chore-1');

    expect(postMock).toHaveBeenCalledWith('/chores/chore-1/revert-last-done');
    expect(postMock).toHaveBeenCalledTimes(1);
  });
});

describe('useRevertLastChoreDone', () => {
  beforeEach(() => {
    vi.spyOn(choresApi, 'revertLastDone').mockReset();
  });

  it('reverts the last completion for the given chore id', async () => {
    const revertMock = vi
      .spyOn(choresApi, 'revertLastDone')
      .mockResolvedValueOnce(makeChore({ id: 'chore-7' }));
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useRevertLastChoreDone(), { wrapper: Wrapper });
    result.current.mutate('chore-7');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(revertMock).toHaveBeenCalledWith('chore-7');
  });

  it('invalidates the chore list, detail, logs AND alerts caches on success', async () => {
    vi.spyOn(choresApi, 'revertLastDone').mockResolvedValueOnce(makeChore({ id: 'chore-7' }));
    const { Wrapper, invalidateSpy } = makeWrapper();

    const { result } = renderHook(() => useRevertLastChoreDone(), { wrapper: Wrapper });
    result.current.mutate('chore-7');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: choreKeys.lists() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: choreKeys.detail('chore-7') });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: choreKeys.logs('chore-7') });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: alertKeys.lists() });
  });
});
