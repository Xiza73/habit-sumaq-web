'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useAuthStore } from '@/core/application/stores/auth.store';

import { authApi } from '@/infrastructure/api/auth.api';

import { analytics } from '@/lib/analytics';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth, clearAuth } = useAuthStore();

  useEffect(() => {
    async function handleCallback() {
      const accessToken = searchParams.get('token');

      if (!accessToken) {
        router.replace('/login');
        return;
      }

      try {
        useAuthStore.getState().setAccessToken(accessToken);
        const user = await authApi.getMe();
        setAuth(accessToken, user);
        // Identify the user in Posthog so cross-device sessions stitch.
        // The backend doesn't yet differentiate signup vs login, so we only
        // emit `login_completed` here. When the response carries an
        // `isNewUser` flag, also call `analytics.signupCompleted('google')`.
        analytics.identify(user.id, { email: user.email });
        analytics.loginCompleted('google');
        // Landing post-login → dashboard de Rutinas. Ver comentario en
        // src/app/page.tsx sobre por qué no lleva a /accounts.
        router.replace('/reports/routines');
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
