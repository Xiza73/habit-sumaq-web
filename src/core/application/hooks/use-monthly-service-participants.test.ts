import { createElement, type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type MonthlyServiceParticipant } from '@/core/domain/entities/monthly-service-participant';
import { monthlyServiceParticipantRowSchema } from '@/core/domain/schemas/monthly-service-participant.schema';

import { monthlyServicesApi } from '@/infrastructure/api/monthly-services.api';

import {
  monthlyServiceParticipantKeys,
  useReplaceParticipants,
  useServiceParticipants,
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

// Re-exercise the row schema through the hook module's re-export surface so
// this file also covers the input type the mutation accepts.
describe('participant row schema used by the hooks', () => {
  it('accepts a valid row payload', () => {
    expect(
      monthlyServiceParticipantRowSchema.safeParse({ reference: 'Ana', defaultAmount: 100 })
        .success,
    ).toBe(true);
  });
});

vi.mock('@/infrastructure/api/monthly-services.api', () => ({
  monthlyServicesApi: {
    getParticipants: vi.fn(),
    replaceParticipants: vi.fn(),
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
 * service, so the replace mutation must invalidate BOTH the participant
 * list key AND the `['monthly-services']` list/detail caches — otherwise a
 * config edit shows inconsistently until the next unrelated refetch.
 */
describe('useReplaceParticipants invalidates participant + monthly-service caches', () => {
  beforeEach(() => {
    vi.mocked(monthlyServicesApi.replaceParticipants).mockReset();
  });

  it('calls the batch PUT with the full submitted list', async () => {
    vi.mocked(monthlyServicesApi.replaceParticipants).mockResolvedValueOnce([
      makeParticipant(),
      makeParticipant({ id: 'p-2', reference: 'Luis', defaultAmount: 50 }),
    ]);
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useReplaceParticipants(SERVICE_ID), { wrapper: Wrapper });
    result.current.mutate([
      { reference: 'Ana', defaultAmount: 100 },
      { reference: 'Luis', defaultAmount: 50 },
    ]);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(monthlyServicesApi.replaceParticipants).toHaveBeenCalledWith(SERVICE_ID, [
      { reference: 'Ana', defaultAmount: 100 },
      { reference: 'Luis', defaultAmount: 50 },
    ]);
  });

  it('invalidates the participant list AND monthly-service list/detail on success', async () => {
    vi.mocked(monthlyServicesApi.replaceParticipants).mockResolvedValueOnce([makeParticipant()]);
    const { Wrapper, invalidateSpy } = makeWrapper();

    const { result } = renderHook(() => useReplaceParticipants(SERVICE_ID), { wrapper: Wrapper });
    result.current.mutate([{ reference: 'Ana', defaultAmount: 100 }]);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: monthlyServiceParticipantKeys.list(SERVICE_ID),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: monthlyServiceKeys.lists() });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: monthlyServiceKeys.detail(SERVICE_ID),
    });
  });

  it('propagates a server error (e.g. duplicate reference) without invalidating', async () => {
    const error = Object.assign(new Error('Duplicate'), {
      code: 'MSP_PARTICIPANT_DUPLICATE_REFERENCE',
    });
    vi.mocked(monthlyServicesApi.replaceParticipants).mockRejectedValueOnce(error);
    const { Wrapper, invalidateSpy } = makeWrapper();

    const { result } = renderHook(() => useReplaceParticipants(SERVICE_ID), { wrapper: Wrapper });
    result.current.mutate([{ reference: 'Ana', defaultAmount: 100 }]);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

describe('useServiceParticipants', () => {
  beforeEach(() => {
    vi.mocked(monthlyServicesApi.getParticipants).mockReset();
  });

  it('fetches the participant list for the given service id', async () => {
    vi.mocked(monthlyServicesApi.getParticipants).mockResolvedValueOnce([makeParticipant()]);
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useServiceParticipants(SERVICE_ID), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(monthlyServicesApi.getParticipants).toHaveBeenCalledWith(SERVICE_ID);
    expect(result.current.data).toEqual([makeParticipant()]);
  });

  it('stays disabled when no service id is given', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useServiceParticipants(undefined), { wrapper: Wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(monthlyServicesApi.getParticipants).not.toHaveBeenCalled();
  });
});
