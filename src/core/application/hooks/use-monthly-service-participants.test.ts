import { createElement, type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type MonthlyServiceParticipant } from '@/core/domain/entities/monthly-service-participant';
import {
  addMonthlyServiceParticipantSchema,
  updateMonthlyServiceParticipantSchema,
} from '@/core/domain/schemas/monthly-service-participant.schema';

import { monthlyServicesApi } from '@/infrastructure/api/monthly-services.api';

import {
  monthlyServiceParticipantKeys,
  useAddParticipant,
  useRemoveParticipant,
} from './use-monthly-service-participants';
import { monthlyServiceKeys } from './use-monthly-services';

describe('monthlyServiceParticipantKeys', () => {
  it('roots every key under ["monthly-service-participants"]', () => {
    expect(monthlyServiceParticipantKeys.all).toEqual(['monthly-service-participants']);
  });

  it('scopes the list key by monthlyServiceId', () => {
    expect(monthlyServiceParticipantKeys.list('svc-1')).toEqual([
      'monthly-service-participants',
      'list',
      'svc-1',
    ]);
  });

  it('produces different list keys for different services', () => {
    expect(monthlyServiceParticipantKeys.list('svc-1')).not.toEqual(
      monthlyServiceParticipantKeys.list('svc-2'),
    );
  });
});

// Re-exercise the schemas through the hook module's re-export surface so
// this file also covers the input types the mutations accept — mirrors
// `use-monthly-service-payments.test.ts`'s pattern of colocating schema
// coverage next to the hooks that consume it.
describe('participant schemas used by the hooks', () => {
  it('accepts a valid add-participant payload', () => {
    expect(
      addMonthlyServiceParticipantSchema.safeParse({ reference: 'Ana', defaultAmount: 100 })
        .success,
    ).toBe(true);
  });

  it('accepts a valid update-participant payload', () => {
    expect(updateMonthlyServiceParticipantSchema.safeParse({ defaultAmount: 120 }).success).toBe(
      true,
    );
  });
});

vi.mock('@/infrastructure/api/monthly-services.api', () => ({
  monthlyServicesApi: {
    addParticipant: vi.fn(),
    removeParticipant: vi.fn(),
  },
}));

const SERVICE_ID = 'svc-1';

function makeParticipant(
  overrides: Partial<MonthlyServiceParticipant> = {},
): MonthlyServiceParticipant {
  return {
    id: 'p-1',
    monthlyServiceId: SERVICE_ID,
    userId: 'u-1',
    reference: 'Ana',
    defaultAmount: 100,
    createdAt: '2026-06-15T12:00:00.000Z',
    updatedAt: '2026-06-15T12:00:00.000Z',
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

/**
 * The service detail view renders the participant list alongside the
 * service, so participant CRUD must invalidate BOTH the participant list
 * key AND the `['monthly-services']` list/detail caches — otherwise a
 * config edit shows inconsistently until the next unrelated refetch.
 */
describe('participant mutations invalidate participant + monthly-service caches', () => {
  beforeEach(() => {
    vi.mocked(monthlyServicesApi.addParticipant).mockReset();
    vi.mocked(monthlyServicesApi.removeParticipant).mockReset();
  });

  it('useAddParticipant invalidates the participant list AND monthly-service list/detail', async () => {
    vi.mocked(monthlyServicesApi.addParticipant).mockResolvedValueOnce(makeParticipant());
    const { Wrapper, invalidateSpy } = makeWrapper();

    const { result } = renderHook(() => useAddParticipant(SERVICE_ID), { wrapper: Wrapper });
    result.current.mutate({ reference: 'Ana', defaultAmount: 100 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: monthlyServiceParticipantKeys.list(SERVICE_ID),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: monthlyServiceKeys.lists() });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: monthlyServiceKeys.detail(SERVICE_ID),
    });
  });

  it('useRemoveParticipant invalidates the participant list AND monthly-service list/detail', async () => {
    vi.mocked(monthlyServicesApi.removeParticipant).mockResolvedValueOnce(undefined);
    const { Wrapper, invalidateSpy } = makeWrapper();

    const { result } = renderHook(() => useRemoveParticipant(SERVICE_ID), { wrapper: Wrapper });
    result.current.mutate('p-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: monthlyServiceParticipantKeys.list(SERVICE_ID),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: monthlyServiceKeys.lists() });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: monthlyServiceKeys.detail(SERVICE_ID),
    });
  });
});
