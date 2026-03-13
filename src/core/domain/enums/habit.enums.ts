export const HabitFrequency = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
} as const;

export type HabitFrequency = (typeof HabitFrequency)[keyof typeof HabitFrequency];
