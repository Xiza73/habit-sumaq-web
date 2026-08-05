import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  __resetViewModeStoreForTests,
  useViewMode,
  VIEW_MODE_STORAGE_PREFIX,
} from './use-view-mode';

function storageKey(moduleKey: string): string {
  return `${VIEW_MODE_STORAGE_PREFIX}${moduleKey}`;
}

describe('useViewMode', () => {
  beforeEach(() => {
    window.localStorage.clear();
    // The module-scoped in-memory fallback is not tied to localStorage — reset
    // it too so a write from a previous test cannot leak into this one.
    __resetViewModeStoreForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("defaults to 'cards' when nothing is persisted", () => {
    const { result } = renderHook(() => useViewMode('debts-loans'));
    expect(result.current[0]).toBe('cards');
  });

  it('reads the persisted mode from localStorage on mount', () => {
    window.localStorage.setItem(storageKey('debts-loans'), 'table');
    const { result } = renderHook(() => useViewMode('debts-loans'));
    expect(result.current[0]).toBe('table');
  });

  it('persists the mode to a namespaced localStorage key when changed', () => {
    const { result } = renderHook(() => useViewMode('debts-loans'));

    act(() => result.current[1]('table'));

    expect(result.current[0]).toBe('table');
    expect(window.localStorage.getItem(storageKey('debts-loans'))).toBe('table');
  });

  it('persists per module key (no cross-talk between modules)', () => {
    const debts = renderHook(() => useViewMode('debts-loans'));
    const chores = renderHook(() => useViewMode('chores'));

    act(() => debts.result.current[1]('table'));

    expect(debts.result.current[0]).toBe('table');
    expect(chores.result.current[0]).toBe('cards');
    expect(window.localStorage.getItem(storageKey('chores'))).toBeNull();
  });

  it("starts a fresh module key at 'cards' even after another module wrote via setMode", () => {
    // Guard against the module-scoped memoryStore leaking across keys: writing
    // one module's mode must not bleed into an untouched module.
    const written = renderHook(() => useViewMode('module-a'));
    act(() => written.result.current[1]('table'));
    expect(written.result.current[0]).toBe('table');

    const fresh = renderHook(() => useViewMode('module-b'));
    expect(fresh.result.current[0]).toBe('cards');
  });

  it('survives a remount (a fresh hook instance reads the stored value)', () => {
    const first = renderHook(() => useViewMode('debts-loans'));
    act(() => first.result.current[1]('table'));
    first.unmount();

    const second = renderHook(() => useViewMode('debts-loans'));
    expect(second.result.current[0]).toBe('table');
  });

  it("falls back to 'cards' and still toggles in-session when localStorage throws (private mode)", () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('SecurityError');
    });

    // Own module key so the module-level in-memory fallback from other tests
    // does not leak into this assertion.
    const { result } = renderHook(() => useViewMode('private-mode-module'));
    expect(result.current[0]).toBe('cards');

    act(() => result.current[1]('table'));
    // Write threw, but the in-memory fallback keeps the toggle working.
    expect(result.current[0]).toBe('table');
    expect(setItem).toHaveBeenCalled();
  });

  it("is hydration-safe: the server snapshot is always 'cards' even when localStorage holds 'table'", () => {
    window.localStorage.setItem(storageKey('debts-loans'), 'table');

    function Probe() {
      const [mode] = useViewMode('debts-loans');
      return createElement('span', null, mode);
    }

    // The server render must match the default client render to avoid a
    // hydration mismatch — it ignores localStorage and yields 'cards'.
    const html = renderToStaticMarkup(createElement(Probe));
    expect(html).toContain('cards');
    expect(html).not.toContain('table');
  });
});
