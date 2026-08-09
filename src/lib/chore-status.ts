import { type ChoreIntervalUnit } from '@/core/domain/entities/chore';

/**
 * Chore card status — derived from `nextDueDate` vs the user's current day,
 * relative to how often the chore actually recurs.
 *
 * - `overdue`  — `nextDueDate` is strictly before today. Red.
 * - `today`    — `nextDueDate` IS today. This is the one the user can act on
 *   right now, so it gets its own chip instead of hiding inside `upcoming`.
 *   Mirrors the backend's `chore-due-today` alert.
 * - `upcoming` — due within {@link upcomingWindowDays} of today. Amber.
 * - `horizon`  — further out than that. Muted, deliberately low contrast.
 *
 * Both date inputs are `YYYY-MM-DD` strings — the helper does not touch
 * timezones, so the caller must pass a "today" computed in the user TZ (we
 * already do that elsewhere via `getTodayLocaleDate`).
 */
export type ChoreStatus = 'overdue' | 'today' | 'upcoming' | 'horizon';

/** The recurrence of a chore, as stored on the entity. */
export interface ChoreCadence {
  intervalValue: number;
  intervalUnit: ChoreIntervalUnit;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Approximate day count per interval unit. Months/years are nominal. */
const DAYS_PER_UNIT: Record<ChoreIntervalUnit, number> = {
  days: 1,
  weeks: 7,
  months: 30,
  years: 365,
};

const MIN_WINDOW_DAYS = 1;
const MAX_WINDOW_DAYS = 7;

/**
 * How many days ahead of `nextDueDate` a chore counts as `upcoming`:
 * **cadence ÷ 7, clamped to [1, 7]**.
 *
 * This used to be a flat 7 days for every chore, which made the label useless
 * exactly where it mattered most: a weekly chore was `upcoming` on all seven
 * days of its cycle, so the chip never changed and carried no signal.
 *
 * Dividing by 7 keeps "upcoming" meaning the same thing at every cadence — the
 * last ~1/7 of the cycle. The floor of 1 keeps the amber chip reachable for
 * short cadences; the cap of 7 stops a yearly chore from being "upcoming" for
 * two months.
 *
 *   daily → 1   weekly → 1   fortnightly → 2
 *   monthly → 4   quarterly → 7   yearly → 7
 */
export function upcomingWindowDays(cadence: ChoreCadence): number {
  const unitDays = DAYS_PER_UNIT[cadence.intervalUnit] ?? DAYS_PER_UNIT.days;
  // A non-positive interval shouldn't be storable, but dividing by it would
  // produce 0 or NaN and silently break the chip — floor it at one cycle.
  const cadenceDays = Math.max(1, cadence.intervalValue) * unitDays;
  const scaled = Math.round(cadenceDays / MAX_WINDOW_DAYS);
  return Math.min(MAX_WINDOW_DAYS, Math.max(MIN_WINDOW_DAYS, scaled));
}

function parseYmd(date: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  // Anchor at noon UTC so day-arithmetic stays stable across DST jumps —
  // the same reasoning as `dateInputToBackendIso` in `format.ts`.
  return Date.UTC(year, month - 1, day, 12, 0, 0);
}

export function getChoreStatus(
  nextDueDate: string,
  today: string,
  cadence: ChoreCadence,
): ChoreStatus {
  const due = parseYmd(nextDueDate);
  const now = parseYmd(today);
  if (due == null || now == null) return 'horizon';

  const diffDays = Math.round((due - now) / DAY_MS);

  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'today';
  if (diffDays <= upcomingWindowDays(cadence)) return 'upcoming';
  return 'horizon';
}
