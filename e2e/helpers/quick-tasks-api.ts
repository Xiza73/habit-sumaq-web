import { type APIRequestContext, expect } from '@playwright/test';

export interface SeedQuickTaskInput {
  title: string;
  description?: string | null;
}

export interface SeededQuickTask {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  position: number;
}

/** Create a quick task via the API. Throws on non-2xx. */
export async function createQuickTask(
  api: APIRequestContext,
  input: SeedQuickTaskInput,
): Promise<SeededQuickTask> {
  const res = await api.post('/api/v1/quick-tasks', { data: input });
  expect(res.ok(), `createQuickTask: ${res.status()} ${res.statusText()}`).toBeTruthy();
  const body = (await res.json()) as { data: SeededQuickTask };
  return body.data;
}

/** Idempotent delete — ignores 404 so afterEach doesn't fail if the test already deleted it. */
export async function deleteQuickTask(api: APIRequestContext, id: string): Promise<void> {
  const res = await api.delete(`/api/v1/quick-tasks/${id}`);
  // 204 is the expected happy path; 404 is acceptable if already gone.
  if (res.status() !== 204 && res.status() !== 404) {
    throw new Error(`deleteQuickTask ${id}: ${res.status()} ${res.statusText()}`);
  }
}

/** Returns all quick tasks for the current user. Convenience for assertions. */
export async function listQuickTasks(api: APIRequestContext): Promise<SeededQuickTask[]> {
  const res = await api.get('/api/v1/quick-tasks');
  expect(res.ok(), `listQuickTasks: ${res.status()}`).toBeTruthy();
  const body = (await res.json()) as { data: SeededQuickTask[] };
  return body.data;
}
