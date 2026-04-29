import { type Chore } from '@/core/domain/entities/chore';
import { type ChoreLog } from '@/core/domain/entities/chore-log';
import {
  type CreateChoreInput,
  type MarkChoreDoneInput,
  type UpdateChoreInput,
} from '@/core/domain/schemas/chore.schema';

import { httpClient, type PaginatedResponse } from './http-client';

export const choresApi = {
  getAll(includeArchived = false): Promise<Chore[]> {
    const query = includeArchived ? '?includeArchived=true' : '';
    return httpClient.get<Chore[]>(`/chores${query}`);
  },

  getById(id: string): Promise<Chore> {
    return httpClient.get<Chore>(`/chores/${id}`);
  },

  /**
   * Paginated logs. The backend wraps the array in the standard ApiResponse
   * envelope and exposes pagination via `meta` (page/limit/total/totalPages).
   * We use `getWithMeta` so the caller gets `{ data, meta }` — matches the
   * pattern used by `habits.getLogs`.
   */
  getLogs(
    id: string,
    params: { limit?: number; offset?: number } = {},
  ): Promise<PaginatedResponse<ChoreLog[]>> {
    const search = new URLSearchParams();
    if (params.limit != null) search.set('limit', String(params.limit));
    if (params.offset != null) search.set('offset', String(params.offset));
    const query = search.toString() ? `?${search.toString()}` : '';
    return httpClient.getWithMeta<ChoreLog[]>(`/chores/${id}/logs${query}`);
  },

  create(data: CreateChoreInput): Promise<Chore> {
    return httpClient.post<Chore>('/chores', data);
  },

  update(id: string, data: UpdateChoreInput): Promise<Chore> {
    return httpClient.patch<Chore>(`/chores/${id}`, data);
  },

  /**
   * Marks the chore as done. Backend persists a `ChoreLog`, advances
   * `lastDoneDate` to `doneAt`, and recomputes `nextDueDate`.
   * `doneAt` is sent as `YYYY-MM-DD` directly — the backend accepts the
   * raw calendar day for these chore-specific endpoints.
   */
  markDone(id: string, data: MarkChoreDoneInput): Promise<Chore> {
    return httpClient.post<Chore>(`/chores/${id}/done`, data);
  },

  /** Skip the current cycle without writing a log. Just advances `nextDueDate`. */
  skip(id: string): Promise<Chore> {
    return httpClient.post<Chore>(`/chores/${id}/skip`);
  },

  toggleArchive(id: string): Promise<Chore> {
    return httpClient.patch<Chore>(`/chores/${id}/archive`);
  },

  /** Hard soft-delete. Fails with `CHRE_001` when the chore has logs. */
  delete(id: string): Promise<void> {
    return httpClient.delete<void>(`/chores/${id}`);
  },
};
