/**
 * Habit period-progress derivation — the single source of truth shared by
 * `HabitCard` and `HabitsTable` so both the cards and the table view compute
 * completion identically.
 *
 * The backend may omit the optional derivatives (`periodCount`,
 * `periodCompleted`) on some responses, so the fallbacks mirror the original
 * card logic exactly:
 *   - `periodCount` falls back to `todayLog.count`, then `0`.
 *   - `isCompleted` falls back to `periodCount >= targetCount`.
 *   - `progress` is the ratio clamped to `[0, 1]`.
 *
 * `todayCount` (today's raw log count) is surfaced separately because the card
 * gates the "undo" (minus) control on `todayCount > 0`.
 */

interface HabitProgressInput {
  todayLog?: { count: number } | null;
  periodCount?: number;
  periodCompleted?: boolean;
  targetCount: number;
}

export interface HabitProgress {
  /** Today's raw log count (drives the card's undo affordance). */
  todayCount: number;
  /** Count toward the target for the active period. */
  periodCount: number;
  /** Whether the period target is met. */
  isCompleted: boolean;
  /** Ratio of `periodCount / targetCount`, clamped to `[0, 1]`. */
  progress: number;
}

export function getHabitProgress(habit: HabitProgressInput): HabitProgress {
  const todayCount = habit.todayLog?.count ?? 0;
  const periodCount = habit.periodCount ?? todayCount;
  const isCompleted = habit.periodCompleted ?? periodCount >= habit.targetCount;
  const progress = Math.min(periodCount / habit.targetCount, 1);
  return { todayCount, periodCount, isCompleted, progress };
}
