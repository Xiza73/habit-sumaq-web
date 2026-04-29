/**
 * Chore card status — derived from `nextDueDate` vs the user's current day.
 *
 * - `overdue`  — `nextDueDate` is strictly before today (the user already
 *   missed it). The card surfaces this in red.
 * - `upcoming` — `nextDueDate` is today or within the next 7 days
 *   (inclusive). Amber chip.
 * - `horizon`  — `nextDueDate` is more than 7 days away. Muted, very
 *   tenuous chip.
 *
 * Both inputs are `YYYY-MM-DD` strings — the helper does not touch timezones,
 * so the caller must pass a "today" computed in the user TZ (we already do
 * that elsewhere via `getTodayLocaleDate`).
 */
export type ChoreStatus = 'overdue' | 'upcoming' | 'horizon';

const DAY_MS = 24 * 60 * 60 * 1000;

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

export function getChoreStatus(nextDueDate: string, today: string): ChoreStatus {
  const due = parseYmd(nextDueDate);
  const now = parseYmd(today);
  if (due == null || now == null) return 'horizon';

  const diffDays = Math.round((due - now) / DAY_MS);

  if (diffDays < 0) return 'overdue';
  if (diffDays <= 7) return 'upcoming';
  return 'horizon';
}
