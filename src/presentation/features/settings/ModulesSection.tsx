'use client';

import { useTranslations } from 'next-intl';

import { toast } from 'sonner';

import {
  useDisabledModules,
  useFavoriteKeys,
  useUpdateUserSettings,
} from '@/core/application/hooks/use-user-settings';

import { ApiError } from '@/infrastructure/api/api-error';

import { isModuleEnabled, MODULE_GROUPS, NAV_REGISTRY } from '@/lib/nav-registry';
import { cn } from '@/lib/utils';

/**
 * Settings section for switching whole modules on and off. A disabled module
 * disappears from the sidebar and the mobile nav, from its slice of the
 * reports dashboards, and from the alerts popover.
 *
 * Nothing is deleted — the data stays and comes back untouched when the module
 * is switched on again. This is about hiding what a given user does not use,
 * not about destroying their history.
 *
 * Grouped exactly like the sidebar (via `MODULE_GROUPS`) so "where do I find
 * this module" has the same answer in both places.
 */
export function ModulesSection() {
  const t = useTranslations('settings.modules');
  const tNav = useTranslations('navigation');
  const tErrors = useTranslations('errors');

  const disabledModules = useDisabledModules();
  const favoriteKeys = useFavoriteKeys();
  const updateSettings = useUpdateUserSettings();

  function toggle(key: string) {
    const enabled = isModuleEnabled(key, disabledModules);

    const nextDisabled = enabled
      ? [...disabledModules, key]
      : disabledModules.filter((k) => k !== key);

    // Disabling a module that is currently a favorite has to drop it from
    // favorites in the SAME write. A favorite pointing at a hidden module
    // would occupy one of the four slots while rendering nothing, and the
    // user could not remove it either — an unrendered item has no row to
    // right-click. That is exactly the soft-lock the stale `favoriteKeys`
    // default used to cause; keeping the two fields consistent at the one
    // point where they can diverge avoids re-deriving it everywhere else.
    const droppedFromFavorites = enabled && favoriteKeys.includes(key);

    updateSettings.mutate(
      {
        disabledModules: nextDisabled,
        ...(droppedFromFavorites && { favoriteKeys: favoriteKeys.filter((k) => k !== key) }),
      },
      {
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
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {MODULE_GROUPS.map((group) => (
        <div key={group.labelKey} className="space-y-1.5">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {tNav(group.labelKey)}
          </h3>
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {group.keys.map((key) => {
              const entry = NAV_REGISTRY[key];
              const enabled = isModuleEnabled(key, disabledModules);
              const Icon = entry.icon;

              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    disabled={updateSettings.isPending}
                    aria-pressed={enabled}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors',
                      enabled
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-muted',
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="flex-1 truncate text-left">{tNav(entry.labelKey)}</span>
                    <span className="shrink-0 text-[11px] uppercase tracking-wide">
                      {enabled ? t('on') : t('off')}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <p className="text-[11px] text-muted-foreground">{t('dataKeptHint')}</p>
    </section>
  );
}
