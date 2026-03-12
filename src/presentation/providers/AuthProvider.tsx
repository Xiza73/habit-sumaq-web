'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuthStore } from '@/core/application/stores/auth.store';

import { authApi } from '@/infrastructure/api/auth.api';
import { httpClient } from '@/infrastructure/api/http-client';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    async function verifySession() {
      const store = useAuthStore.getState();

      // Restore token from cookie if lost (e.g. page refresh)
      if (!store.accessToken) {
        store.hydrateToken();
      }

      const { accessToken } = useAuthStore.getState();

      // If still no token after hydration, try refresh
      if (!accessToken) {
        const refreshed = await httpClient.tryRefresh();
        if (!refreshed) {
          store.clearAuth();
          router.replace('/login');
          setIsChecking(false);
          return;
        }
      }

      try {
        const user = await authApi.getMe();
        const currentToken = useAuthStore.getState().accessToken;
        if (currentToken) {
          useAuthStore.getState().setAuth(currentToken, user);
        }
        setIsAuthenticated(true);
      } catch {
        useAuthStore.getState().clearAuth();
        router.replace('/login');
      } finally {
        setIsChecking(false);
      }
    }

    void verifySession();
  }, [router]);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
