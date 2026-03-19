import { useAuthStore } from '@/core/application/stores/auth.store';

import { env } from '@/infrastructure/config/env';

import { ApiError } from './api-error';

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
    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) return false;

      const json = (await response.json()) as ApiResponse<{ accessToken: string }>;
      if (json.success && json.data.accessToken) {
        useAuthStore.getState().setAccessToken(json.data.accessToken);
        return true;
      }

      return false;
    } catch {
      return false;
    }
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

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const httpClient = new HttpClient(env.API_URL);
