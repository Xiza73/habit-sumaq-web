'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useFavoriteKeys } from '@/core/application/hooks/use-user-settings';

import { resolveFirstFavoriteRoute } from '@/lib/nav-registry';

/**
 * Home / landing route.
 *
 * Lives inside the `(dashboard)` route group so the `AuthProvider` in its
 * layout has already confirmed the session before this component mounts —
 * we never reach the favorite-resolver in an unauthenticated state.
 *
 * Once mounted, the page reads the user's favorite keys (loading falls
 * back to `DEFAULT_FAVORITES`) and redirects to the first registry-known
 * entry. That way every user lands on the surface they actually care
 * about instead of a hardcoded dashboard.
 *
 * Why `router.replace` (not `push`): the user pressing "back" from `/debts`
 * should NOT return them to `/` (which would just redirect them forward
 * again). Replace keeps history clean.
 */
export default function Home() {
  const router = useRouter();
  const favoriteKeys = useFavoriteKeys();

  useEffect(() => {
    router.replace(resolveFirstFavoriteRoute(favoriteKeys));
  }, [router, favoriteKeys]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>
  );
}
