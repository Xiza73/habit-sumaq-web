'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuthStore } from '@/core/application/stores/auth.store';

import { authApi } from '@/infrastructure/api/auth.api';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const { accessToken, setUser, clearAuth } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  const verifySession = useCallback(async () => {
    if (!accessToken) {
      setIsChecking(false);
      router.replace('/login');
      return;
    }

    try {
      const user = await authApi.getMe();
      setUser(user);
    } catch {
      clearAuth();
      router.replace('/login');
    } finally {
      setIsChecking(false);
    }
  }, [accessToken, setUser, clearAuth, router]);

  useEffect(() => {
    void verifySession();
  }, [verifySession]);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!accessToken) return null;

  return <>{children}</>;
}
