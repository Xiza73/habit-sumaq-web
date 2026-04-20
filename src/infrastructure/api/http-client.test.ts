/**
 * Focused coverage for the HTTP client.
 *
 * The headline test is the 204-response case: `request()` used to call
 * `response.json()` unconditionally, which blew up on empty bodies from
 * DELETE and PATCH /reorder endpoints. These tests lock that path down
 * plus a few other contracts worth guarding.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/core/application/stores/auth.store';

import { ApiError } from './api-error';
import { httpClient } from './http-client';

/** Builds a `fetch`-compatible response mock from a status + optional body. */
function mockResponse(status: number, body?: unknown): Response {
  const init: ResponseInit = { status };
  if (body === undefined) {
    // 204 / similar: no body. Passing `null` to new Response lines up with
    // what a real no-content server returns — attempting response.json()
    // would throw, which is the exact bug we're guarding against.
    return new Response(null, init);
  }
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('httpClient', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    // Ensure every test starts from a clean auth slate.
    useAuthStore.setState({ accessToken: null, user: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('successful responses', () => {
    it('returns the `data` field from a 200 wrapped ApiResponse body', async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse(200, {
          success: true,
          data: { id: 'abc', name: 'test' },
          message: 'ok',
          error: null,
        }),
      );

      const result = await httpClient.get<{ id: string; name: string }>('/things/abc');

      expect(result).toEqual({ id: 'abc', name: 'test' });
    });

    it('resolves with undefined on 204 No Content without touching the body', async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(204));

      // `delete` is the primary caller for 204 responses — same code path
      // serves PATCH /quick-tasks/reorder too.
      const result = await httpClient.delete<void>('/things/abc');

      expect(result).toBeUndefined();
    });

    it('serializes the request body as JSON for POST/PATCH', async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse(201, { success: true, data: { id: 'new' }, message: 'ok', error: null }),
      );

      await httpClient.post('/things', { name: 'thing' });

      const call = fetchMock.mock.calls[0];
      expect(call[1]?.method).toBe('POST');
      expect(call[1]?.body).toBe(JSON.stringify({ name: 'thing' }));
    });

    it('omits the body when the caller passes nothing to post/patch', async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(204));

      await httpClient.patch('/things/abc/action');

      expect(fetchMock.mock.calls[0][1]?.body).toBeUndefined();
    });
  });

  describe('headers', () => {
    it('injects the bearer token when the auth store has one', async () => {
      useAuthStore.setState({ accessToken: 'jwt-token', user: null });
      fetchMock.mockResolvedValueOnce(
        mockResponse(200, { success: true, data: null, message: 'ok', error: null }),
      );

      await httpClient.get('/me');

      const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer jwt-token');
    });

    it('does not set Authorization when no token is stored', async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse(200, { success: true, data: null, message: 'ok', error: null }),
      );

      await httpClient.get('/public');

      const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
    });

    it('includes the X-Timezone header on every request', async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse(200, { success: true, data: null, message: 'ok', error: null }),
      );

      await httpClient.get('/anything');

      const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>;
      expect(headers['X-Timezone']).toBeDefined();
      expect(headers['X-Timezone'].length).toBeGreaterThan(0);
    });
  });

  describe('error responses', () => {
    it('throws ApiError when the body has success=false', async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse(404, {
          success: false,
          data: null,
          message: 'Cuenta no encontrada',
          error: { code: 'ACC_001' },
        }),
      );

      await expect(httpClient.get('/accounts/missing')).rejects.toMatchObject({
        name: 'ApiError',
        message: 'Cuenta no encontrada',
        code: 'ACC_001',
      });
    });

    it('surfaces validation details from the error body', async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse(400, {
          success: false,
          data: null,
          message: 'Los datos enviados son inválidos',
          error: {
            code: 'GEN_001',
            details: [{ field: 'title', message: 'required' }],
          },
        }),
      );

      try {
        await httpClient.post('/things', {});
        expect.fail('request should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).details).toEqual([{ field: 'title', message: 'required' }]);
      }
    });
  });

  describe('401 handling', () => {
    it('clears auth and throws Session expired when refresh fails', async () => {
      useAuthStore.setState({ accessToken: 'stale-token', user: null });
      const clearSpy = vi.spyOn(useAuthStore.getState(), 'clearAuth');

      fetchMock
        .mockResolvedValueOnce(mockResponse(401)) // original request unauthorized
        .mockResolvedValueOnce(mockResponse(401)); // refresh rejected

      // `window.location.href = '/login'` is the last line before throwing.
      // jsdom allows the assignment (no-op navigation) so we only need to
      // assert the surface: the thrown ApiError and the auth cleared state.
      await expect(httpClient.get('/me')).rejects.toMatchObject({
        name: 'ApiError',
        code: 'AUT_001',
      });

      expect(clearSpy).toHaveBeenCalled();
      expect(useAuthStore.getState().accessToken).toBeNull();
    });

    it('retries the original request after a successful refresh', async () => {
      useAuthStore.setState({ accessToken: 'stale', user: null });

      fetchMock
        .mockResolvedValueOnce(mockResponse(401)) // original → unauthorized
        .mockResolvedValueOnce(
          mockResponse(200, {
            success: true,
            data: { accessToken: 'fresh' },
            message: 'ok',
            error: null,
          }),
        ) // /auth/refresh → new access token
        .mockResolvedValueOnce(
          mockResponse(200, { success: true, data: { id: 'me' }, message: 'ok', error: null }),
        ); // retried original → success

      const result = await httpClient.get<{ id: string }>('/me');

      expect(result).toEqual({ id: 'me' });
      expect(useAuthStore.getState().accessToken).toBe('fresh');
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
  });
});
