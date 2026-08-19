import { type APIRequestContext, expect } from '@playwright/test';

export interface SeedChoreInput {
  name: string;
  intervalValue?: number;
  intervalUnit?: 'days' | 'weeks' | 'months' | 'years';
  startDate?: string;
  notes?: string;
  category?: string;
}

export interface SeededChore {
  id: string;
  name: string;
  nextDueDate: string;
}

/** Create a chore via the API. Throws on non-2xx. */
export async function createChore(
  api: APIRequestContext,
  input: SeedChoreInput,
): Promise<SeededChore> {
  const res = await api.post('/api/v1/chores', {
    data: {
      intervalValue: 2,
      intervalUnit: 'weeks',
      startDate: '2026-01-05',
      ...input,
    },
  });
  expect(res.ok(), `createChore: ${res.status()} ${res.statusText()}`).toBeTruthy();
  const body = (await res.json()) as { data: SeededChore };
  return body.data;
}

/** Idempotent delete — ignores 404 so cleanup never fails a passing test. */
export async function deleteChore(api: APIRequestContext, id: string): Promise<void> {
  const res = await api.delete(`/api/v1/chores/${id}`);
  if (!res.ok() && res.status() !== 404) {
    throw new Error(`deleteChore ${id}: ${res.status()} ${res.statusText()}`);
  }
}
