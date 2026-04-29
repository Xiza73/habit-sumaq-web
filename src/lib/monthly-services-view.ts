import { type Category } from '@/core/domain/entities/category';
import { type MonthlyService } from '@/core/domain/entities/monthly-service';
import {
  type MonthlyServicesGroupBy,
  type MonthlyServicesOrderBy,
  type MonthlyServicesOrderDir,
} from '@/core/domain/enums/common.enums';

/**
 * Pure helpers that turn the user's persisted view preferences into a sorted
 * (and optionally grouped) list. Kept independent of any component so we can
 * unit test the bordercases (null fields, archived-vs-active, etc.) cheaply.
 */

export interface MonthlyServiceGroup {
  /** Stable id (same value as `key`) used as React key. */
  id: string;
  /**
   * Identifies the group. For `groupBy='status'` this is one of
   * `overdue|pending|paid|archived`; for `frequency` it is the
   * `frequencyMonths` integer as string; for `category` it is the categoryId
   * (or `null-category` for uncategorised); for `none` only one group with
   * key `'all'` is produced.
   */
  key: string;
  services: MonthlyService[];
}

/**
 * Sort + group pipeline: first sort the full list, then split it into
 * stable-ordered groups according to `groupBy`. Sorting first keeps each
 * group internally sorted without re-sorting per-group.
 */
export function applyView(
  services: MonthlyService[],
  preferences: {
    groupBy: MonthlyServicesGroupBy;
    orderBy: MonthlyServicesOrderBy;
    orderDir: MonthlyServicesOrderDir;
  },
  categoriesById?: Map<string, Category>,
): MonthlyServiceGroup[] {
  const sorted = sortServices(services, preferences.orderBy, preferences.orderDir);
  return groupServices(sorted, preferences.groupBy, categoriesById);
}

/**
 * Comparator that consistently puts `null` after non-null values regardless
 * of direction — UX rule: missing values don't compete in the order.
 */
function compareNullable<T>(
  a: T | null,
  b: T | null,
  cmp: (x: T, y: T) => number,
  dir: MonthlyServicesOrderDir,
): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1; // null after
  if (b === null) return -1; // null after
  const ord = cmp(a, b);
  return dir === 'desc' ? -ord : ord;
}

export function sortServices(
  services: MonthlyService[],
  orderBy: MonthlyServicesOrderBy,
  dir: MonthlyServicesOrderDir,
): MonthlyService[] {
  const out = [...services];
  switch (orderBy) {
    case 'name': {
      const collator = new Intl.Collator(undefined, { sensitivity: 'base' });
      out.sort((a, b) => {
        const ord = collator.compare(a.name, b.name);
        return dir === 'desc' ? -ord : ord;
      });
      break;
    }
    case 'dueDay': {
      // Nullable. dueDay is 1..31 — plain numeric compare.
      out.sort((a, b) => compareNullable(a.dueDay, b.dueDay, (x, y) => x - y, dir));
      break;
    }
    case 'nextDuePeriod': {
      // YYYY-MM strings sort lexicographically equivalent to chronologically.
      // Always present (backend computes it) — no nullability handling needed.
      out.sort((a, b) => {
        const ord = a.nextDuePeriod.localeCompare(b.nextDuePeriod);
        return dir === 'desc' ? -ord : ord;
      });
      break;
    }
    case 'estimatedAmount': {
      out.sort((a, b) =>
        compareNullable(a.estimatedAmount, b.estimatedAmount, (x, y) => x - y, dir),
      );
      break;
    }
    case 'createdAt': {
      // ISO strings are lexicographically sortable.
      out.sort((a, b) => {
        const ord = a.createdAt.localeCompare(b.createdAt);
        return dir === 'desc' ? -ord : ord;
      });
      break;
    }
  }
  return out;
}

/**
 * The order in which `status` groups appear — overdue first so the user
 * sees what's bleeding before what's healthy.
 */
const STATUS_ORDER = ['overdue', 'pending', 'paid', 'archived'] as const;
type StatusKey = (typeof STATUS_ORDER)[number];

function statusOf(service: MonthlyService): StatusKey {
  if (!service.isActive) return 'archived';
  if (service.isOverdue) return 'overdue';
  if (service.isPaidForCurrentMonth) return 'paid';
  return 'pending';
}

/**
 * Frequency groups appear in ascending order of months (1, 3, 6, 12). Matches
 * the user's mental model: "shortest cadence first".
 */
const FREQUENCY_ORDER = [1, 3, 6, 12];

export function groupServices(
  sorted: MonthlyService[],
  groupBy: MonthlyServicesGroupBy,
  categoriesById?: Map<string, Category>,
): MonthlyServiceGroup[] {
  if (groupBy === 'none') {
    return [{ id: 'all', key: 'all', services: sorted }];
  }

  if (groupBy === 'status') {
    const buckets = new Map<StatusKey, MonthlyService[]>();
    for (const s of sorted) {
      const k = statusOf(s);
      const list = buckets.get(k);
      if (list) list.push(s);
      else buckets.set(k, [s]);
    }
    return STATUS_ORDER.filter((k) => buckets.has(k)).map((k) => ({
      id: `status-${k}`,
      key: k,
      services: buckets.get(k) ?? [],
    }));
  }

  if (groupBy === 'frequency') {
    const buckets = new Map<number, MonthlyService[]>();
    for (const s of sorted) {
      const list = buckets.get(s.frequencyMonths);
      if (list) list.push(s);
      else buckets.set(s.frequencyMonths, [s]);
    }
    return FREQUENCY_ORDER.filter((n) => buckets.has(n)).map((n) => ({
      id: `frequency-${n}`,
      key: String(n),
      services: buckets.get(n) ?? [],
    }));
  }

  // category — preserve sort order and group by categoryId. Uncategorised
  // (no match in the lookup) goes to the end.
  const buckets = new Map<string, MonthlyService[]>();
  // First pass keeps the natural appearance order — we render groups in the
  // order their first service appears, which (because the list is sorted)
  // gives a meaningful sequence for the user.
  const seenOrder: string[] = [];
  for (const s of sorted) {
    const cat = categoriesById?.get(s.categoryId);
    const k = cat ? cat.id : 'null-category';
    const existing = buckets.get(k);
    if (existing) existing.push(s);
    else {
      buckets.set(k, [s]);
      seenOrder.push(k);
    }
  }
  // Push 'null-category' to the end if it exists.
  const uncategorisedIdx = seenOrder.indexOf('null-category');
  if (uncategorisedIdx >= 0) {
    seenOrder.splice(uncategorisedIdx, 1);
    seenOrder.push('null-category');
  }
  return seenOrder.map((k) => ({
    id: `category-${k}`,
    key: k,
    services: buckets.get(k) ?? [],
  }));
}
