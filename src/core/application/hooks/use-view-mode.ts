'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Shared "cards vs table" view-mode primitive.
 *
 * WAVE 1 reference consumer: the Debts/Loans dashboard. This hook is
 * intentionally generic — WAVE 2 reuses it verbatim for Monthly Services,
 * Chores, Habits and Categories by passing a different `moduleKey`.
 *
 * Design contract:
 *   - Preference is stored in `localStorage` under a namespaced key, so it is
 *     naturally PER-DEVICE (never synced to the server).
 *   - SSR / hydration-safe: the server snapshot and the first client render
 *     both resolve to `'cards'`, so there is never a hydration mismatch. The
 *     persisted value is picked up right after hydration via
 *     `useSyncExternalStore` (which uses `getServerSnapshot` during hydration
 *     and switches to the live snapshot once mounted).
 *   - Degrades gracefully when `localStorage` is unavailable or throws
 *     (private mode / quota): reads fall back to `'cards'`, and an in-memory
 *     store keeps the toggle working for the current session.
 *   - Cross-tab aware: reacts to `storage` events so a change in one tab
 *     reflects in the others.
 */

export const VIEW_MODES = ['cards', 'table'] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

export const DEFAULT_VIEW_MODE: ViewMode = 'cards';

/** Namespaced prefix for the per-module localStorage key. */
export const VIEW_MODE_STORAGE_PREFIX = 'habit-sumaq:view-mode:';

/** Same-tab change signal (the `storage` event only fires cross-tab). */
const VIEW_MODE_EVENT = 'habit-sumaq:view-mode-change';

/**
 * In-memory fallback so toggling still works when `localStorage` is
 * unavailable (private mode) and so same-tab reads are consistent even if a
 * write silently failed.
 */
const memoryStore = new Map<string, ViewMode>();

/**
 * Test-only: clear the module-scoped in-memory fallback so state written by one
 * test (via `setMode` when localStorage is unavailable, or the private-mode
 * path) cannot leak into the next. Call it alongside `localStorage.clear()` in
 * a `beforeEach`. No-op semantics in production (never called there).
 */
export function __resetViewModeStoreForTests(): void {
  memoryStore.clear();
}

function storageKey(moduleKey: string): string {
  return `${VIEW_MODE_STORAGE_PREFIX}${moduleKey}`;
}

function isViewMode(value: unknown): value is ViewMode {
  return value === 'cards' || value === 'table';
}

function readStored(moduleKey: string): ViewMode {
  try {
    const raw = window.localStorage.getItem(storageKey(moduleKey));
    if (isViewMode(raw)) return raw;
  } catch {
    // localStorage unavailable / throwing — fall through to the memory store.
  }
  return memoryStore.get(moduleKey) ?? DEFAULT_VIEW_MODE;
}

function writeStored(moduleKey: string, mode: ViewMode): void {
  // Always keep the in-memory copy so the session works even if the write
  // below throws (private mode / quota exceeded).
  memoryStore.set(moduleKey, mode);
  try {
    window.localStorage.setItem(storageKey(moduleKey), mode);
  } catch {
    // Ignore: the in-memory store already holds the value.
  }
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  window.addEventListener(VIEW_MODE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(VIEW_MODE_EVENT, callback);
  };
}

/**
 * `[mode, setMode]` for a module's cards/table preference.
 *
 * @param moduleKey Stable identifier for the module (e.g. `'debts-loans'`).
 *   Used to namespace the localStorage key.
 */
export function useViewMode(moduleKey: string): [ViewMode, (mode: ViewMode) => void] {
  const getSnapshot = useCallback(() => readStored(moduleKey), [moduleKey]);

  const mode = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_VIEW_MODE);

  const setMode = useCallback(
    (next: ViewMode) => {
      writeStored(moduleKey, next);
      window.dispatchEvent(new Event(VIEW_MODE_EVENT));
    },
    [moduleKey],
  );

  return [mode, setMode];
}
