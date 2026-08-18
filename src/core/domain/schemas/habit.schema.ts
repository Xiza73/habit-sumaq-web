import { z } from 'zod/v4';

export const createHabitSchema = z.object({
  name: z.string().min(1, 'required').max(100, 'max_length'),
  description: z.string().max(500).nullable().optional(),
  frequency: z.enum(['DAILY', 'WEEKLY']),
  targetCount: z.number().int().min(1),
  color: z.string().max(7).nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
});

export type CreateHabitInput = z.infer<typeof createHabitSchema>;

export const updateHabitSchema = z.object({
  name: z.string().min(1, 'required').max(100, 'max_length'),
  description: z.string().max(500).nullable().optional(),
  frequency: z.enum(['DAILY', 'WEEKLY']),
  targetCount: z.number().int().min(1),
  color: z.string().max(7).nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
});

export type UpdateHabitInput = z.infer<typeof updateHabitSchema>;

export const habitLogSchema = z.object({
  date: z.string().min(1, 'required'),
  count: z.number().int().min(0),
  /**
   * Target for THIS day. Omitted, the server keeps the day's existing target
   * and only falls back to the habit's default for a day with no log — so
   * re-logging a day you forgot never re-stamps it with today's default.
   */
  targetCount: z.number().int().min(1).optional(),
  note: z.string().max(500).nullable().optional(),
});

export type HabitLogInput = z.infer<typeof habitLogSchema>;
