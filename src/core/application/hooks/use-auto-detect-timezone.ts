'use client';

import { useEffect, useRef } from 'react';

import { useUpdateUserSettings, useUserSettings } from './use-user-settings';

/**
 * First-login timezone bootstrap.
 *
 * After the settings query resolves, if the backend has the default `'UTC'`
 * timezone and the browser reports a different IANA zone, we silently PATCH
 * the user settings once per page load. No toast — this is a one-shot
 * migration for users who never touched Settings.
 *
 * Safe to mount in `DashboardShell` — runs once the user is authenticated.
 */
export function useAutoDetectTimezone(): void {
  const { data: settings } = useUserSettings();
  const update = useUpdateUserSettings();
  const ranRef = useRef(false);

  useEffect(() => {
    if (!settings || ranRef.current) return;
    if (settings.timezone !== 'UTC') return;

    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!detected || detected === 'UTC') return;

    ranRef.current = true;
    update.mutate({ timezone: detected });
    // update is intentionally omitted from deps — we only want this on settings change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);
}
