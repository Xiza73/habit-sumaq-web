import { type APIRequestContext, expect } from '@playwright/test';

export interface SeedBudgetInput {
  year?: number;
  month?: number;
  currency: 'PEN' | 'USD' | 'EUR';
  amount: number;
}

export interface SeededBudget {
  id: string;
  userId: string;
  year: number;
  month: number;
  currency: string;
  amount: number;
}

/** Create a budget via the API. Throws on non-2xx. */
export async function createBudget(
  api: APIRequestContext,
  input: SeedBudgetInput,
): Promise<SeededBudget> {
  const res = await api.post('/api/v1/budgets', { data: input });
  expect(res.ok(), `createBudget: ${res.status()} ${res.statusText()}`).toBeTruthy();
  const body = (await res.json()) as { data: SeededBudget };
  return body.data;
}

/** Idempotent delete — ignores 404 so afterEach doesn't fail if the test already deleted it. */
export async function deleteBudget(api: APIRequestContext, id: string): Promise<void> {
  const res = await api.delete(`/api/v1/budgets/${id}`);
  if (res.status() !== 204 && res.status() !== 404) {
    throw new Error(`deleteBudget ${id}: ${res.status()} ${res.statusText()}`);
  }
}

/** Returns all budgets for the current user. Convenience for assertions. */
export async function listBudgets(api: APIRequestContext): Promise<SeededBudget[]> {
  const res = await api.get('/api/v1/budgets');
  expect(res.ok(), `listBudgets: ${res.status()}`).toBeTruthy();
  const body = (await res.json()) as { data: SeededBudget[] };
  return body.data;
}

/** Returns the current month's budget for the given currency, or null when none. */
export async function getCurrentBudget(
  api: APIRequestContext,
  currency: 'PEN' | 'USD' | 'EUR',
): Promise<SeededBudget | null> {
  const res = await api.get(`/api/v1/budgets/current?currency=${currency}`);
  expect(res.ok(), `getCurrentBudget: ${res.status()}`).toBeTruthy();
  const body = (await res.json()) as { data: SeededBudget | null };
  return body.data;
}
