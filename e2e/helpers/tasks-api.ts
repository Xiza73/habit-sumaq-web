import { type APIRequestContext, expect } from '@playwright/test';

// ─── Sections ────────────────────────────────────────────────────────────────

export interface SeedSectionInput {
  name: string;
  color?: string;
}

export interface SeededSection {
  id: string;
  userId: string;
  name: string;
  color: string | null;
  position: number;
}

export async function createSection(
  api: APIRequestContext,
  input: SeedSectionInput,
): Promise<SeededSection> {
  const res = await api.post('/api/v1/tasks/sections', { data: input });
  expect(res.ok(), `createSection: ${res.status()} ${res.statusText()}`).toBeTruthy();
  const body = (await res.json()) as { data: SeededSection };
  return body.data;
}

/**
 * Cascade delete — also wipes tasks inside. Idempotent: 404 is treated as a no-op
 * so test cleanup blocks don't error out when the section was already removed.
 */
export async function deleteSection(api: APIRequestContext, id: string): Promise<void> {
  const res = await api.delete(`/api/v1/tasks/sections/${id}`);
  if (res.status() !== 204 && res.status() !== 404) {
    throw new Error(`deleteSection ${id}: ${res.status()} ${res.statusText()}`);
  }
}

export async function listSections(api: APIRequestContext): Promise<SeededSection[]> {
  const res = await api.get('/api/v1/tasks/sections');
  expect(res.ok(), `listSections: ${res.status()}`).toBeTruthy();
  const body = (await res.json()) as { data: SeededSection[] };
  return body.data;
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export interface SeedTaskInput {
  sectionId: string;
  title: string;
  description?: string | null;
}

export interface SeededTask {
  id: string;
  userId: string;
  sectionId: string;
  title: string;
  description: string | null;
  completed: boolean;
  completedAt: string | null;
  position: number;
}

export async function createTask(
  api: APIRequestContext,
  input: SeedTaskInput,
): Promise<SeededTask> {
  const res = await api.post('/api/v1/tasks', { data: input });
  expect(res.ok(), `createTask: ${res.status()} ${res.statusText()}`).toBeTruthy();
  const body = (await res.json()) as { data: SeededTask };
  return body.data;
}

export async function deleteTask(api: APIRequestContext, id: string): Promise<void> {
  const res = await api.delete(`/api/v1/tasks/${id}`);
  if (res.status() !== 204 && res.status() !== 404) {
    throw new Error(`deleteTask ${id}: ${res.status()} ${res.statusText()}`);
  }
}

export async function listTasks(api: APIRequestContext): Promise<SeededTask[]> {
  const res = await api.get('/api/v1/tasks');
  expect(res.ok(), `listTasks: ${res.status()}`).toBeTruthy();
  const body = (await res.json()) as { data: SeededTask[] };
  return body.data;
}
