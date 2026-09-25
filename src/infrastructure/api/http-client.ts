import { readAccessTokenCookie, useAuthStore } from '@/core/application/stores/auth.store';

import { env } from '@/infrastructure/config/env';

import { ApiError } from './api-error';

/**
 * How long to wait for another window's token rotation to land, and how often
 * to look.
 *
 * The backend rotates refresh tokens single-use: `RotateRefreshTokenUseCase`
 * revokes the presented one before issuing the next. That is fine with one
 * window and fatal with several, because the single-flight guard below is a
 * field on THIS instance, and every desktop window is its own webview with its
 * own instance of it. Nothing serialises them.
 *
 * So when `pip:changed` makes every window refetch in the same instant and the
 * access token happens to be expired, they all present the same refresh token:
 * one rotates it, the rest are handed a revoked one and used to log out — the
 * window you acted in stayed, the others dropped to the login screen.
 *
 * A loser does not need a rotation of its own. The winner already wrote the
 * new access token to the cookie every window shares, so the loser just has to
 * look. The realistic gap is tens of milliseconds: both requests left together
 * and the winner only has a `json()` and a setter to go.
 *
 * ponytail: a poll, not a cross-window lock. A lease in localStorage would
 * drop the wait but brings stale-lock recovery along with it, for a race that
 * settles in one round trip.
 */
const ADOPT_TOKEN_TIMEOUT_MS = 500;
const ADOPT_TOKEN_INTERVAL_MS = 50;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T;
  meta: PaginationMeta;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  error: {
    code: string;
    details?: Array<{ field: string; message: string }>;
  } | null;
  meta?: PaginationMeta | null;
}

class HttpClient {
  private baseURL: string;
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;
  private readonly timezone: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = useAuthStore.getState().accessToken;

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Timezone': this.timezone,
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
    });

    if (response.status === 401) {
      const refreshed = await this.handleTokenRefresh();
      if (refreshed) {
        return this.request<T>(endpoint, options);
      }
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
      throw new ApiError('Session expired', 'AUT_001');
    }

    // 204 No Content has no body — calling response.json() would throw
    // SyntaxError. Callers that hit endpoints with 204 (DELETEs, reorder)
    // typed as Promise<void>, so resolving with undefined is safe.
    if (response.status === 204) {
      return undefined as T;
    }

    const json = (await response.json()) as ApiResponse<T>;

    if (!json.success) {
      throw new ApiError(json.message, json.error?.code, json.error?.details);
    }

    return json.data;
  }

  private async handleTokenRefresh(): Promise<boolean> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.refreshToken();

    try {
      return await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  async tryRefresh(): Promise<boolean> {
    return this.handleTokenRefresh();
  }

  private async refreshToken(): Promise<boolean> {
    // Captured before the attempt: anything OTHER than this showing up in the
    // shared cookie means a different window rotated in the meantime.
    const tokenBefore = useAuthStore.getState().accessToken;

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const json = (await response.json()) as ApiResponse<{ accessToken: string }>;
        if (json.success && json.data.accessToken) {
          useAuthStore.getState().setAccessToken(json.data.accessToken);
          return true;
        }
      }
    } catch {
      // A network failure lands in the same place as a rejected rotation:
      // another window may still have succeeded on our behalf.
    }

    return this.adoptTokenFromAnotherWindow(tokenBefore);
  }

  /**
   * Last resort before logging out: pick up the access token another window
   * published after winning the rotation.
   *
   * Returns false when nothing new appears, which is the genuine expiry path —
   * no window could refresh, so the session really is over.
   */
  private async adoptTokenFromAnotherWindow(tokenBefore: string | null): Promise<boolean> {
    const deadline = Date.now() + ADOPT_TOKEN_TIMEOUT_MS;

    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, ADOPT_TOKEN_INTERVAL_MS));

      const published = readAccessTokenCookie();
      // The token we already had says nothing — it means no one has written
      // yet, or there is no one else to write.
      if (published && published !== tokenBefore) {
        useAuthStore.getState().setAccessToken(published);
        return true;
      }
    }

    return false;
  }

  async requestWithMeta<T>(endpoint: string, options?: RequestInit): Promise<PaginatedResponse<T>> {
    const token = useAuthStore.getState().accessToken;

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Timezone': this.timezone,
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
    });

    if (response.status === 401) {
      const refreshed = await this.handleTokenRefresh();
      if (refreshed) {
        return this.requestWithMeta<T>(endpoint, options);
      }
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
      throw new ApiError('Session expired', 'AUT_001');
    }

    const json = (await response.json()) as ApiResponse<T>;

    if (!json.success) {
      throw new ApiError(json.message, json.error?.code, json.error?.details);
    }

    return {
      data: json.data,
      meta: json.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  }

  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  getWithMeta<T>(endpoint: string): Promise<PaginatedResponse<T>> {
    return this.requestWithMeta<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const httpClient = new HttpClient(env.API_URL);
