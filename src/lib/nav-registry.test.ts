import { describe, expect, it } from 'vitest';

import {
  DEFAULT_FAVORITES,
  FAVORITE_KEYS,
  getNavEntries,
  isFavoriteKey,
  MAX_FAVORITES,
  NAV_REGISTRY,
} from './nav-registry';

describe('nav-registry — invariants', () => {
  it('exposes a registry entry for every key in FAVORITE_KEYS', () => {
    // Catches the foot-gun of adding a key to the array but forgetting the
    // matching entry — TypeScript catches it too, but the runtime check
    // surfaces the failure as a clean assertion if the type guards ever drift.
    for (const key of FAVORITE_KEYS) {
      expect(NAV_REGISTRY[key]).toBeDefined();
      expect(NAV_REGISTRY[key].key).toBe(key);
    }
  });

  it('keeps MAX_FAVORITES in sync with the backend cap (= 4)', () => {
    // Backend `@ArrayMaxSize(4)` + SQL CHECK rely on this number staying 4.
    // If we ever bump this, both repos need to move in lockstep.
    expect(MAX_FAVORITES).toBe(4);
  });

  it('ships DEFAULT_FAVORITES with exactly 4 known keys (matches the backend column default)', () => {
    expect(DEFAULT_FAVORITES).toHaveLength(4);
    for (const key of DEFAULT_FAVORITES) {
      expect(isFavoriteKey(key)).toBe(true);
    }
  });
});

describe('isFavoriteKey', () => {
  it('returns true for known keys', () => {
    expect(isFavoriteKey('habits')).toBe(true);
    expect(isFavoriteKey('reports-finances')).toBe(true);
  });

  it('returns false for unknown keys (no Settings, no random strings)', () => {
    expect(isFavoriteKey('settings')).toBe(false);
    expect(isFavoriteKey('totally-not-a-route')).toBe(false);
    expect(isFavoriteKey('')).toBe(false);
  });
});

describe('getNavEntries', () => {
  it('returns the entries for known keys, preserving input order', () => {
    // Order matters — mobile uses it for slot order.
    const result = getNavEntries(['habits', 'accounts', 'budgets']);
    expect(result.map((e) => e.key)).toEqual(['habits', 'accounts', 'budgets']);
  });

  it('silently drops unknown keys (forward-compat with deprecated/renamed routes)', () => {
    // Repro: a user has an old favorite key stored that no longer exists in
    // the registry (we removed a route between releases). We want the
    // remaining favorites to still render — not a runtime crash.
    const result = getNavEntries(['habits', 'this-route-was-removed', 'accounts']);
    expect(result.map((e) => e.key)).toEqual(['habits', 'accounts']);
  });

  it('returns an empty array when no keys are given', () => {
    expect(getNavEntries([])).toEqual([]);
  });

  it('does not deduplicate — caller is responsible (backend already enforces ArrayUnique)', () => {
    // Backend rejects duplicates at write-time. If somehow a duplicate slipped
    // through, we render it twice rather than silently swallow it.
    const result = getNavEntries(['habits', 'habits']);
    expect(result).toHaveLength(2);
  });
});
