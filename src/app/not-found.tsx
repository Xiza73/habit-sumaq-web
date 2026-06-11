'use client';

import Link from 'next/link';

import { useFavoriteKeys } from '@/core/application/hooks/use-user-settings';

import { resolveFirstFavoriteRoute } from '@/lib/nav-registry';

export default function NotFound() {
  // Reuses the same resolver as `(dashboard)/page.tsx` so the 404 home
  // button always lands on whatever the user actually opens first. When
  // the favorites query is still loading the hook falls back to
  // DEFAULT_FAVORITES — same result the home redirect would pick on a
  // cold load, so the two surfaces stay consistent.
  const favoriteKeys = useFavoriteKeys();
  const homeHref = resolveFirstFavoriteRoute(favoriteKeys);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-muted text-3xl font-bold text-muted-foreground">
        ?
      </div>
      <h1 className="text-2xl font-bold">404</h1>
      <p className="max-w-xs text-muted-foreground">La página que buscas no existe o fue movida.</p>
      <Link
        href={homeHref}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Ir al inicio
      </Link>
    </div>
  );
}
