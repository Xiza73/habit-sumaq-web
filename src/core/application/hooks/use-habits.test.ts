import { createElement, type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type HabitWithStats } from '@/core/domain/entities/habit';

import { habitsApi } from '@/infrastructure/api/habits.api';

import { getTodayLocaleDate } from '@/lib/format';

import { useCelebrationStore } from '../stores/celebration.store';

import { habitKeys, useLogHabit } from './use-habits';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/infrastructure/api/habits.api', () => ({
  habitsApi: { createLog: vi.fn() },
}));

vi.mock('@/lib/analytics', () => ({ analytics: { habitLogged: vi.fn() } }));
vi.mock('@/lib/confetti', () => ({ fireCelebrationConfetti: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const HABIT_ID = 'habit-1';

function makeHabit(currentStreak: number): HabitWithStats {
  return {
    id: HABIT_ID,
    userId: 'user-1',
    name: 'Tomar agua',
    description: null,
    frequency: 'DAILY',
    targetCount: 1,
    color: '#2196F3',
    icon: null,
    isArchived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    currentStreak,
    longestStreak: currentStreak,
    completionRate: 1,
    todayLog: null,
    periodCount: 0,
    periodCompleted: false,
    periodTarget: 1,
    rescuableDate: null,
    periodRescued: false,
    rescuedDates: [],
  };
}

/**
 * Seeds the daily cache for `date` at streak 29 and makes the mocked
 * `createLog` bump it to 30 — the `month` milestone, which is the tier that
 * pops the modal rather than only toasting.
 */
function makeWrapper(date: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.setQueryData<HabitWithStats[]>(habitKeys.daily(date), [makeHabit(29)]);

  vi.mocked(habitsApi.createLog).mockImplementation(() => {
    // Stands in for the backend recomputing the streak: by the time
    // `onSuccess` reads the cache, it sees the crossed milestone.
    queryClient.setQueryData<HabitWithStats[]>(habitKeys.daily(date), [makeHabit(30)]);
    return Promise.resolve(undefined as never);
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return { Wrapper, queryClient };
}

function yesterdayOf(today: string): string {
  const d = new Date(`${today}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

describe('useLogHabit — streak celebration', () => {
  // Swapping the store's own `trigger` for a mock keeps the assertion on
  // "was a celebration requested?" rather than on the modal's rendered state.
  const triggerSpy = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useCelebrationStore.setState({ active: null, trigger: triggerSpy });
  });

  it('celebrates a milestone crossed by logging TODAY', async () => {
    const today = getTodayLocaleDate();
    const { Wrapper } = makeWrapper(today);

    const { result } = renderHook(() => useLogHabit(), { wrapper: Wrapper });
    result.current.mutate({ habitId: HABIT_ID, data: { date: today, count: 1 } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() => expect(triggerSpy).toHaveBeenCalledTimes(1));
    expect(triggerSpy).toHaveBeenCalledWith(expect.objectContaining({ days: 30 }));
  });

  it('stays silent when the same milestone is crossed by back-filling a past day', async () => {
    // The whole point of the guard: the streak really did move to 30, but the
    // user was filling in a day they forgot — congratulating them for it reads
    // as a bug, not a reward.
    const past = yesterdayOf(getTodayLocaleDate());
    const { Wrapper } = makeWrapper(past);

    const { result } = renderHook(() => useLogHabit(), { wrapper: Wrapper });
    result.current.mutate({ habitId: HABIT_ID, data: { date: past, count: 1 } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(triggerSpy).not.toHaveBeenCalled();
  });

  it('still writes the back-filled day to the cache — only the celebration is gated', async () => {
    const past = yesterdayOf(getTodayLocaleDate());
    const { Wrapper, queryClient } = makeWrapper(past);

    const { result } = renderHook(() => useLogHabit(), { wrapper: Wrapper });
    result.current.mutate({ habitId: HABIT_ID, data: { date: past, count: 1 } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const cached = queryClient.getQueryData<HabitWithStats[]>(habitKeys.daily(past));
    expect(cached?.[0].currentStreak).toBe(30);
  });
});

/**
 * A client seeded with BOTH caches and a request that never settles.
 *
 * `makeWrapper` cannot be reused here: its mock overwrites the daily cache when
 * the call resolves, which is right for the celebration tests and fatal for
 * these — the optimistic patch is precisely what exists only BEFORE the server
 * answers.
 */
function makeOptimisticWrapper(date: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.setQueryData<HabitWithStats[]>(habitKeys.daily(date), [makeHabit(29)]);
  queryClient.setQueryData<HabitWithStats>(habitKeys.detail(HABIT_ID), makeHabit(29));
  vi.mocked(habitsApi.createLog).mockImplementation(() => new Promise(() => undefined));

  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return { Wrapper, queryClient };
}

describe('useLogHabit - the optimistic patch reaches the detail query', () => {
  it('patches the detail cache, not only the day list', async () => {
    // The floating window and the habit page both read the detail query. Only
    // the list was patched, so a check-in from either sat on the old count
    // until the refetch landed — the lag that was reported.
    const today = getTodayLocaleDate();
    const { Wrapper, queryClient } = makeOptimisticWrapper(today);

    const { result } = renderHook(() => useLogHabit(), { wrapper: Wrapper });
    result.current.mutate({ habitId: HABIT_ID, data: { date: today, count: 1 } });

    await waitFor(() => {
      const detail = queryClient.getQueryData<HabitWithStats>(habitKeys.detail(HABIT_ID));
      expect(detail?.periodCount).toBe(1);
      expect(detail?.periodCompleted).toBe(true);
    });
  });

  it('leaves the detail alone when back-filling a past day', async () => {
    // The detail's `todayLog` means TODAY. Patching it from a back-fill would
    // put an older day's count on today's card.
    const past = '2026-01-05';
    const { Wrapper, queryClient } = makeOptimisticWrapper(past);

    const { result } = renderHook(() => useLogHabit(), { wrapper: Wrapper });
    result.current.mutate({ habitId: HABIT_ID, data: { date: past, count: 1 } });

    // The day's own list still moves — only the detail is held back.
    await waitFor(() => {
      expect(
        queryClient.getQueryData<HabitWithStats[]>(habitKeys.daily(past))?.[0].periodCount,
      ).toBe(1);
    });
    expect(queryClient.getQueryData<HabitWithStats>(habitKeys.detail(HABIT_ID))?.periodCount).toBe(
      0,
    );
  });
});
