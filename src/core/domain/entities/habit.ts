import { type HabitFrequency } from '@/core/domain/enums/habit.enums';

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
}
