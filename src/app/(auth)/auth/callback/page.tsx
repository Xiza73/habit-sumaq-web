'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useAuthStore } from '@/core/application/stores/auth.store';

import { authApi } from '@/infrastructure/api/auth.api';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth, clearAuth } = useAuthStore();

  useEffect(() => {
    async function handleCallback() {
      const accessToken = searchParams.get('accessToken');

      if (!accessToken) {
        router.replace('/login');
        return;
      }

      try {
        useAuthStore.getState().setAccessToken(accessToken);
        const user = await authApi.getMe();
        setAuth(accessToken, user);
        router.replace('/accounts');
      } catch {
        clearAuth();
        router.replace('/login');
      }
    }

    void handleCallback();
  }, [searchParams, setAuth, clearAuth, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
