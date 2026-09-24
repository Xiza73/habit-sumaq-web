'use client';

import { useEffect } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { canUsePip, HABITS_CHANGED_EVENT } from '@/lib/pip-window';

import { habitKeys } from './use-habits';
import { userSettingsKeys } from './use-user-settings';

/**
 * Keeps the habit data in every desktop window agreeing with every other.
 *
 * A Tauri window is a separate webview: separate JS context, separate TanStack
 * cache. Checking in from the floating popup invalidates only ITS cache, so
 * the main window would keep rendering the previous count — two numbers for
 * the same habit, on screen at the same time.
 *
 * Settings ride along because the shield stock lives there and the popup can
 * spend one.
 *
 * No-op outside Tauri, where there is only ever one window.
 */
export function useHabitsWindowSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!canUsePip()) return;

    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      const { listen } = await import('@tauri-apps/api/event');
      const stop = await listen(HABITS_CHANGED_EVENT, () => {
        void queryClient.invalidateQueries({ queryKey: habitKeys.all });
        void queryClient.invalidateQueries({ queryKey: userSettingsKeys.all });
      });
      // The window can close while the import is in flight; without this the
      // listener outlives the effect and leaks.
      if (cancelled) stop();
      else unlisten = stop;
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [queryClient]);
}

/**
 * Tells the OTHER windows that habit data moved.
 *
 * Deliberately fire-and-forget: a failed broadcast must never turn a
 * successful check-in into an error toast. The worst case is a stale count in
 * a window the user is not looking at, which the next refetch fixes anyway.
 */
export function notifyHabitsChanged(): void {
  if (!canUsePip()) return;
  void import('@tauri-apps/api/event')
    .then(({ emit }) => emit(HABITS_CHANGED_EVENT))
    .catch(() => undefined);
}
