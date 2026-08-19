import { z } from 'zod/v4';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Date and time are both optional, but a time REQUIRES a date. The refinement
 * mirrors the backend's `RMDR_008` so the user gets the message inline instead
 * of as a round-trip error.
 */
const scheduleShape = {
  remindDate: z
    .string()
    .regex(DATE_REGEX, 'invalid_date')
    .nullable()
    .optional()
    // An empty date input submits '', which is neither a date nor null.
    .or(z.literal('').transform(() => null)),
  remindTime: z
    .string()
    .regex(TIME_REGEX, 'invalid_time')
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
};

function requireDateForTime<T extends { remindDate?: unknown; remindTime?: unknown }>(
  value: T,
  ctx: z.RefinementCtx,
): void {
  if (value.remindTime && !value.remindDate) {
    ctx.addIssue({
      code: 'custom',
      path: ['remindTime'],
      message: 'time_without_date',
    });
  }
}

export const createReminderSchema = z
  .object({
    title: z.string().min(1, 'required').max(120, 'max_length'),
    notes: z.string().max(5000).nullable().optional(),
    ...scheduleShape,
  })
  .superRefine(requireDateForTime);

export type CreateReminderInput = z.infer<typeof createReminderSchema>;

export const updateReminderSchema = z
  .object({
    title: z.string().min(1, 'required').max(120, 'max_length').optional(),
    notes: z.string().max(5000).nullable().optional(),
    completed: z.boolean().optional(),
    ...scheduleShape,
  })
  .superRefine(requireDateForTime);

export type UpdateReminderInput = z.infer<typeof updateReminderSchema>;
