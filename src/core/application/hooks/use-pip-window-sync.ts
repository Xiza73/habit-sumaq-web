'use client';

import { useEffect } from 'react';

import { type QueryKey, useQueryClient } from '@tanstack/react-query';

import { canUsePip, PIP_CHANGED_EVENT } from '@/lib/pip-window';

/**
 * Keeps the data in every desktop window agreeing with every other.
 *
 * A Tauri window is a separate webview: separate JS context, separate TanStack
 * cache. Acting from a floating popup invalidates only ITS cache, so the main
 * window would keep rendering the previous state — two versions of the same
 * row, on screen at the same time.
 *
 * `keys` is what THIS window cares about. The event carries no payload, so a
 * window occasionally refetches over a change in a module it does not show;
 * that costs one request and removes any chance of a module forgetting to
 * announce itself.
 *
 * No-op outside Tauri, where there is only ever one window.
 */
export function usePipWindowSync(keys: readonly QueryKey[]) {
  const queryClient = useQueryClient();
  // Serialised so a fresh array literal on every render does not re-subscribe.
  const keysKey = JSON.stringify(keys);

  useEffect(() => {
    if (!canUsePip()) return;

    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      const { listen } = await import('@tauri-apps/api/event');
      const stop = await listen(PIP_CHANGED_EVENT, () => {
        for (const key of JSON.parse(keysKey) as QueryKey[]) {
          void queryClient.invalidateQueries({ queryKey: key });
        }
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
  }, [queryClient, keysKey]);
}

/**
 * Tells the OTHER windows that something they might be showing moved.
 *
 * Deliberately fire-and-forget: a failed broadcast must never turn a
 * successful write into an error toast. The worst case is stale data in a
 * window the user is not looking at, which the next refetch fixes anyway.
 */
export function notifyPipChanged(): void {
  if (!canUsePip()) return;
  void import('@tauri-apps/api/event')
    .then(({ emit }) => emit(PIP_CHANGED_EVENT))
    .catch(() => undefined);
}
