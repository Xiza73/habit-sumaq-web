import {
  BarChart3,
  CheckSquare,
  FolderTree,
  HandCoins,
  ListChecks,
  type LucideIcon,
  PiggyBank,
  Receipt,
  Repeat2,
  Target,
} from 'lucide-react';

/**
 * Single source of truth for the navigation universe. Every item the user can
 * mark as a favorite lives here — `MobileNav`, `Sidebar`, the Settings page
 * "Favoritos" section, and the inline picker all read the same map.
 *
 * Settings is intentionally EXCLUDED — it's always fixed at the end of the
 * mobile bottom nav and at the bottom of the sidebar, so it isn't a
 * "favoritable" item. The user can't toggle it.
 *
 * The keys are short, stable identifiers (no leading slash, no dots). They
 * persist server-side in `user_settings.favoriteKeys` AS-IS, so changing
 * one here is a breaking change for users with that key already stored —
 * if you ever need to rename one, ship a backfill that maps the old key
 * to the new one. Adding NEW keys (e.g. a new route) is safe.
 */
export const FAVORITE_KEYS = [
  // Finances — `transactions` was dropped in A6-W.3 and `accounts` in
  // A6-W.5 of the accounts-to-modular-finance v1.0.0 refactor. Users with
  // either key persisted in their favoriteKeys still survive:
  // `getNavEntries` silently filters unknown keys, so the slot stays
  // empty until they re-pick.
  'debts',
  'categories',
  'services',
  'budgets',
  // Routines
  'habits',
  'quick-tasks',
  'tasks',
  'chores',
  // Reports — namespaced because there are two reports dashboards
  'reports-finances',
  'reports-routines',
] as const;

export type FavoriteKey = (typeof FAVORITE_KEYS)[number];

/** Per-entry metadata. `labelKey` lives under the `navigation.*` i18n namespace. */
export interface NavEntry {
  /** Stable key — what we persist in `user_settings.favoriteKeys`. */
  key: FavoriteKey;
  /** App route the icon links to. */
  href: string;
  /** Key under the `navigation.*` i18n namespace for the visible label. */
  labelKey: string;
  /**
   * Optional shorter label key for surfaces with constrained width — used
   * by `MobileNav` slots where the icon needs to stay centered and the
   * label has to fit in a single line. Falls back to `labelKey` when not
   * set. The sidebar + settings page + picker always use the full
   * `labelKey` so the user sees the descriptive name there.
   */
  shortLabelKey?: string;
  /** Icon component from `lucide-react`. */
  icon: LucideIcon;
}

/**
 * Lookup-by-key for the nav entries. Use `getNavEntries(keys)` instead of
 * indexing directly when the keys come from `favoriteKeys` — that helper
 * filters out unknown keys (which can show up if a user has an old key
 * persisted that's been removed since).
 */
export const NAV_REGISTRY: Record<FavoriteKey, NavEntry> = {
  // Finances
  debts: {
    key: 'debts',
    // Promoted to top-level finances route in A6-W.3 (was `/transactions/debts`
    // before the legacy transactions UI got dropped).
    href: '/debts',
    labelKey: 'debts',
    // "Deudas y préstamos" wraps to 2 lines in the mobile slot and pushes
    // the icon off-center. Short label keeps everything single-line.
    shortLabelKey: 'debtsShort',
    icon: HandCoins,
  },
  categories: {
    key: 'categories',
    href: '/categories',
    labelKey: 'categories',
    icon: FolderTree,
  },
  services: { key: 'services', href: '/services', labelKey: 'services', icon: Receipt },
  budgets: { key: 'budgets', href: '/budgets', labelKey: 'budgets', icon: PiggyBank },
  // Routines
  habits: { key: 'habits', href: '/habits', labelKey: 'habits', icon: Target },
  'quick-tasks': {
    key: 'quick-tasks',
    href: '/quick-tasks',
    labelKey: 'priorities',
    icon: CheckSquare,
  },
  tasks: { key: 'tasks', href: '/tasks', labelKey: 'tasks', icon: ListChecks },
  chores: { key: 'chores', href: '/chores', labelKey: 'chores', icon: Repeat2 },
  // Reports
  'reports-finances': {
    key: 'reports-finances',
    href: '/reports/finances',
    labelKey: 'finances',
    icon: BarChart3,
  },
  'reports-routines': {
    key: 'reports-routines',
    href: '/reports/routines',
    labelKey: 'routines',
    icon: BarChart3,
  },
};

/**
 * Defaults shipped in the backend column default — kept in sync here so the
 * frontend has the same answer when the API returns an empty array or the
 * settings query hasn't loaded yet.
 */
export const DEFAULT_FAVORITES: FavoriteKey[] = [
  // v1.0.0 defaults — `accounts` got dropped in A6-W.5 (the route is gone)
  // and `transactions` in A6-W.3. The slot is filled by `debts` which
  // surfaces the v1.0.0 `debts_loans` module.
  'debts',
  'budgets',
  'habits',
  'quick-tasks',
];

/** Hard cap. Matches backend `@ArrayMaxSize(4)` + SQL CHECK constraint. */
export const MAX_FAVORITES = 4;

/** Type guard — narrows an arbitrary string to a known `FavoriteKey`. */
export function isFavoriteKey(value: string): value is FavoriteKey {
  return (FAVORITE_KEYS as readonly string[]).includes(value);
}

/**
 * Resolve a list of persisted keys into rendering-ready `NavEntry` objects.
 *
 * Drops unknown keys silently — that's how we tolerate a user whose
 * `favoriteKeys` contains an item that no longer exists in the registry
 * (e.g. we removed a route). They'll see one fewer favorite until they
 * reconfigure; nothing crashes.
 *
 * Order in the input is preserved in the output — favorite order is the
 * user's mobile-slot order, so it matters.
 */
export function getNavEntries(keys: readonly string[]): NavEntry[] {
  const result: NavEntry[] = [];
  for (const key of keys) {
    if (isFavoriteKey(key)) {
      result.push(NAV_REGISTRY[key]);
    }
  }
  return result;
}
