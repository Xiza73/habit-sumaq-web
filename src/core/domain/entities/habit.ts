import { type HabitFrequency } from '@/core/domain/enums/habit.enums';

/**
 * Cap on shields in hand. Mirrors `MAX_STREAK_SHIELDS` in the backend, which
 * the DB enforces with `CK_user_settings_streak_shields_range` — so this is not
 * a client-side preference, it is the real ceiling.
 *
 * The UI needs it to warn BEFORE releasing a rescue: at a full stock the
 * refunded shield has nowhere to land and is lost.
 */
export const MAX_STREAK_SHIELDS = 2;

export interface Habit {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  frequency: HabitFrequency;
  targetCount: number;
  color: string | null;
  icon: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string;
  count: number;
  completed: boolean;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  /**
   * The target that applied to THIS day, snapshotted server-side when the log
   * was written. Use it as the denominator for that day — reading the habit's
   * `targetCount` instead is what made raising a habit rewrite history, turning
   * every finished past day into "3/4".
   */
  targetCount: number;
}

export interface HabitWithStats extends Habit {
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
  todayLog: HabitLog | null;
  periodCount: number;
  periodCompleted: boolean;
  /**
   * The denominator for the CURRENT period. For DAILY habits it is the day's
   * own target and may differ from the habit's `targetCount`; for WEEKLY it is
   * the habit's, because the objective belongs to the week.
   *
   * Always render `periodCount / periodTarget`. Never reach for
   * `habit.targetCount` — that is the bug this field exists to prevent.
   */
  periodTarget: number;
  /**
   * The period a streak shield can rescue RIGHT NOW, as `YYYY-MM-DD`, or null
   * when there is nothing to rescue. For a WEEKLY habit it is the Monday of
   * the rescuable week.
   *
   * Recomputed by the backend on every read — the window closes on its own as
   * the period passes, so this is never stale.
   *
   * The rescue button needs BOTH this and `streakShields > 0` from settings:
   * one says there is something to save, the other that the user can pay for
   * it.
   */
  rescuableDate: string | null;
  /**
   * Whether the period being VIEWED is already covered by a spent shield.
   *
   * A rescued period has no log, so without this it renders exactly like a
   * missed one — which is how a user logs over their own shield and burns it
   * on a period that no longer needed protecting.
   *
   * For a WEEKLY habit this answers for the WEEK of the date in view, not the
   * day.
   */
  periodRescued: boolean;
  /**
   * Every rescued period of the habit, as `YYYY-MM-DD` (the Monday, for
   * WEEKLY). The heatmap needs the whole set: a rescued day has no log, so
   * without it the history shows "missed" for days the user paid to protect.
   */
  rescuedDates: string[];
}
