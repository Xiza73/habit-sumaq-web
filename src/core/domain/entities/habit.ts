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
}

export interface HabitWithStats extends Habit {
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
  todayLog: HabitLog | null;
  periodCount: number;
  periodCompleted: boolean;
}
