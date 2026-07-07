'use client';

import { useCallback, useEffect, useState } from 'react';

import { isTauri } from '@tauri-apps/api/core';
import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart';

/**
 * Launch-on-login state, backed by `tauri-plugin-autostart`.
 *
 * - `'unsupported'` — not running inside the Tauri desktop shell (browser/PWA).
 *   A web page cannot register itself into the OS startup, so the UI hides the
 *   whole section in this case.
 * - `'loading'` — inside Tauri, still reading the current OS registration.
 * - `'ready'` — usable; `enabled` reflects the real OS state.
 */
type AutostartStatus = 'unsupported' | 'loading' | 'ready';

interface UseAutostart {
  enabled: boolean;
  status: AutostartStatus;
  pending: boolean;
  /** Applies `next` to the OS; returns whether it succeeded. */
  toggle: (next: boolean) => Promise<boolean>;
}

export function useAutostart(): UseAutostart {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<AutostartStatus>('loading');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;

    // Wrapped in an async closure so the initial detection runs off the
    // synchronous effect body (the OS read is async anyway, and `isTauri()`
    // touches `window`, which only exists on the client).
    void (async () => {
      if (!isTauri()) {
        if (active) setStatus('unsupported');
        return;
      }
      try {
        const current = await isEnabled();
        if (!active) return;
        setEnabled(current);
        setStatus('ready');
      } catch {
        // The plugin errored (e.g. missing capability) — treat as unavailable
        // rather than showing a toggle that can't work.
        if (active) setStatus('unsupported');
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const toggle = useCallback(async (next: boolean): Promise<boolean> => {
    setPending(true);
    try {
      if (next) {
        await enable();
      } else {
        await disable();
      }
      setEnabled(next);
      return true;
    } catch {
      return false;
    } finally {
      setPending(false);
    }
  }, []);

  return { enabled, status, pending, toggle };
}
