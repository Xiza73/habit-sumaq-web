import { create } from 'zustand';

import { type User } from '@/core/domain/entities/user';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  setAccessToken: (token: string) => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setAuth: (accessToken, user) => set({ accessToken, user }),
  clearAuth: () => set({ accessToken: null, user: null }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
}));
