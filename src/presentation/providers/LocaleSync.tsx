'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';

import { useUserSettings } from '@/core/application/hooks/use-user-settings';

import { locales } from '@/i18n/config';

/**
 * Keeps the rendered locale in sync with the user's saved `language` setting.
 *
 * The UI locale is driven by the `NEXT_LOCALE` cookie (read server-side in
 * `src/i18n/request.ts`); the preference itself lives on `user_settings`.
 * Nothing initialized that cookie from the saved setting on login, so a user
 * whose setting is `en` but whose cookie is absent rendered in the default
 * locale (`es`). This bridges the two: when they diverge, write the cookie and
 * reload once so the server re-renders in the right language.
 *
 * Loop-safe: after the reload the cookie matches `settings.language`, so
 * `useLocale()` equals it and the effect early-returns. The `locales` guard
 * avoids a loop if the stored language is ever an unsupported value (the cookie
 * would fall back to the default and never match the preference).
 *
 * Renders nothing.
 */
export function LocaleSync() {
  const locale = useLocale();
  const { data: settings } = useUserSettings();

  useEffect(() => {
    if (!settings) return;
    const preferred = settings.language;
    if (!locales.includes(preferred) || preferred === locale) return;

    document.cookie = `NEXT_LOCALE=${preferred};path=/;max-age=31536000`;
    window.location.reload();
  }, [settings, locale]);

  return null;
}
