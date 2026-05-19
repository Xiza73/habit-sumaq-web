'use client';

import { useTranslations } from 'next-intl';

import { Star } from 'lucide-react';
import { toast } from 'sonner';

import { useFavoriteKeys, useUpdateUserSettings } from '@/core/application/hooks/use-user-settings';

import { ApiError } from '@/infrastructure/api/api-error';

import { FAVORITE_KEYS, MAX_FAVORITES, NAV_REGISTRY } from '@/lib/nav-registry';
import { cn } from '@/lib/utils';

/**
 * Settings page section that lets the user pick which {@link MAX_FAVORITES}
 * nav items appear in the mobile bottom nav and as ★-marked in the
 * desktop sidebar. Companion to the inline UX (mobile long-press + web
 * right-click) — both write to the same `favoriteKeys` field on
 * `user_settings`.
 *
 * UI: vertical list of every favoritable item with a toggle button on the
 * right. The toggle is disabled when the user already has 4 favorites and
 * the item isn't one of them — they have to remove one first. Order in
 * `favoriteKeys` is preserved by appending newly-added items; removing
 * keeps the rest in their original order.
 */
export function FavoritesSection() {
  const t = useTranslations('settings.favorites');
  const tNav = useTranslations('navigation');
  const tErrors = useTranslations('errors');

  const favoriteKeys = useFavoriteKeys();
  const updateSettings = useUpdateUserSettings();
  const favoriteSet = new Set(favoriteKeys);
  const atMax = favoriteKeys.length >= MAX_FAVORITES;

  function toggle(key: string) {
    const isCurrentlyFavorite = favoriteSet.has(key);

    // The button itself is `disabled` when at max + not currently favorite,
    // so this guard is defense-in-depth.
    if (!isCurrentlyFavorite && atMax) {
      toast.error(t('maxReached', { max: MAX_FAVORITES }));
      return;
    }

    const next = isCurrentlyFavorite
      ? favoriteKeys.filter((k) => k !== key)
      : [...favoriteKeys, key];

    updateSettings.mutate(
      { favoriteKeys: next },
      {
        // No success toast on favorite changes — the toggled card state IS
        // the visible feedback, and a bottom-of-screen toast would overlap
        // the mobile bottom nav (which is rendering the same favorites).
        // Errors still surface — they're rare + important.
        onError: (error) => {
          toast.error(
            error instanceof ApiError && error.code && tErrors.has(error.code)
              ? tErrors(error.code as 'ACC_001')
              : t('saveError'),
          );
        },
      },
    );
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        <p className="text-sm text-muted-foreground">{t('subtitle', { max: MAX_FAVORITES })}</p>
      </div>
      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {FAVORITE_KEYS.map((key) => {
          const entry = NAV_REGISTRY[key];
          const isFavorite = favoriteSet.has(key);
          // Disable the "add" action when the user is already at max. The
          // "remove" action stays enabled even at max (otherwise the user
          // would be locked into their current set).
          const disabled = !isFavorite && atMax;
          const Icon = entry.icon;

          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => toggle(key)}
                disabled={disabled || updateSettings.isPending}
                aria-pressed={isFavorite}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors',
                  isFavorite
                    ? 'border-primary bg-primary/10 text-primary'
                    : disabled
                      ? 'cursor-not-allowed border-border text-muted-foreground/50'
                      : 'border-border hover:bg-muted',
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="flex-1 truncate text-left">{tNav(entry.labelKey)}</span>
                {isFavorite && <Star className="size-4 fill-current" aria-hidden />}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-muted-foreground">{t('rightClickHint')}</p>
    </section>
  );
}
