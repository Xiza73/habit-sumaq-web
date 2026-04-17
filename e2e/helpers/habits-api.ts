import { type APIRequestContext, expect } from '@playwright/test';

export interface SeedHabitInput {
  name: string;
  frequency?: 'DAILY' | 'WEEKLY';
  targetCount?: number;
  color?: string;
  description?: string | null;
}

export interface SeededHabit {
  id: string;
  name: string;
  userId: string;
  targetCount: number;
}

/** Create a habit via the API. Throws on non-2xx. */
export async function createHabit(
  api: APIRequestContext,
  input: SeedHabitInput,
): Promise<SeededHabit> {
  const res = await api.post('/api/v1/habits', {
    data: {
      frequency: 'DAILY',
      targetCount: 1,
      color: '#2196F3',
      ...input,
    },
  });
  expect(res.ok(), `createHabit: ${res.status()} ${res.statusText()}`).toBeTruthy();
  const body = (await res.json()) as { data: SeededHabit };
  return body.data;
}

/** Idempotent delete — ignores 404 so afterEach doesn't fail if the test already deleted it. */
export async function deleteHabit(api: APIRequestContext, id: string): Promise<void> {
  const res = await api.delete(`/api/v1/habits/${id}`);
  if (!res.ok() && res.status() !== 404) {
    throw new Error(`deleteHabit ${id}: ${res.status()} ${res.statusText()}`);
  }
}

/** Seed a log entry for a habit on a specific date. */
export async function logHabit(
  api: APIRequestContext,
  habitId: string,
  date: string,
  count: number,
): Promise<void> {
  const res = await api.post(`/api/v1/habits/${habitId}/logs`, {
    data: { date, count },
  });
  expect(res.ok(), `logHabit: ${res.status()} ${res.statusText()}`).toBeTruthy();
}
