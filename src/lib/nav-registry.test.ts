import { describe, expect, it } from 'vitest';

import {
  DEFAULT_FAVORITES,
  FAVORITE_KEYS,
  getNavEntries,
  isFavoriteKey,
  MAX_FAVORITES,
  NAV_REGISTRY,
  resolveFirstFavoriteRoute,
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
    const result = getNavEntries(['habits', 'debts', 'budgets']);
    expect(result.map((e) => e.key)).toEqual(['habits', 'debts', 'budgets']);
  });

  it('silently drops unknown keys (forward-compat with deprecated/renamed routes)', () => {
    // Repro: a user has an old favorite key stored that no longer exists in
    // the registry (we removed a route between releases). We want the
    // remaining favorites to still render — not a runtime crash.
    // A6-W.5 dropped `accounts` — perfect candidate for the "removed key
    // survives" test.
    const result = getNavEntries(['habits', 'this-route-was-removed', 'accounts', 'debts']);
    expect(result.map((e) => e.key)).toEqual(['habits', 'debts']);
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

describe('resolveFirstFavoriteRoute', () => {
  it("returns the href of the user's first favorite when known", () => {
    // Single source of truth for the landing/404 redirect — picks habits
    // because that's the user's first slot, not whatever the hardcoded
    // default used to be.
    expect(resolveFirstFavoriteRoute(['habits', 'debts'])).toBe('/habits');
  });

  it('skips unknown keys at the head of the list and returns the first known one', () => {
    // Repro: user has a legacy key persisted (e.g. `accounts`, removed in
    // A6-W.5) followed by valid ones. We should land on the next valid key
    // instead of falling all the way through to the default chain.
    expect(resolveFirstFavoriteRoute(['accounts', 'debts'])).toBe('/debts');
  });

  it('falls back to the first DEFAULT_FAVORITES route when every user key is unknown', () => {
    // Same scenario as the unknown-key drop test on getNavEntries, but at the
    // redirect layer. Today DEFAULT_FAVORITES[0] === 'debts' → /debts.
    expect(resolveFirstFavoriteRoute(['totally-removed', 'also-removed'])).toBe('/debts');
  });

  it('falls back to the first DEFAULT_FAVORITES route when keys is empty', () => {
    // Hits during loading state — useUserSettings returns undefined and
    // the favorites hook falls through to DEFAULT_FAVORITES anyway, but the
    // helper has to be safe to call with [] too.
    expect(resolveFirstFavoriteRoute([])).toBe('/debts');
  });
});
