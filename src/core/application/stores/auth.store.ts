import { create } from 'zustand';

import { type User } from '@/core/domain/entities/user';

const TOKEN_COOKIE = 'access_token';

function persistToken(token: string) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${TOKEN_COOKIE}=${token}; path=/; SameSite=Lax; max-age=86400${secure}`;
}

function removeToken() {
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0`;
}

function readToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${TOKEN_COOKIE}=([^;]*)`));
  return match ? match[1] : null;
}

interface AuthState {
  accessToken: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  setAccessToken: (token: string) => void;
  setUser: (user: User) => void;
  hydrateToken: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setAuth: (accessToken, user) => {
    persistToken(accessToken);
    set({ accessToken, user });
  },
  clearAuth: () => {
    removeToken();
    set({ accessToken: null, user: null });
  },
  setAccessToken: (accessToken) => {
    persistToken(accessToken);
    set({ accessToken });
  },
  setUser: (user) => set({ user }),
  hydrateToken: () => {
    const token = readToken();
    if (token) set({ accessToken: token });
  },
}));
