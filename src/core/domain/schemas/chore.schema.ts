import { z } from 'zod/v4';

import { CHORE_INTERVAL_UNITS } from '@/core/domain/entities/chore';

const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

// Use a literal-based schema so the inferred type is the narrow union
// `'days' | 'weeks' | 'months' | 'years'` — that lets RHF + the resolver line
// up the form shape with the entity field.
const intervalUnitSchema = z.enum([...CHORE_INTERVAL_UNITS] as [string, ...string[]], {
  message: 'invalid_interval_unit',
});

export const createChoreSchema = z.object({
  name: z.string().trim().min(1, 'required').max(100, 'max_length'),
  notes: z.string().max(1000, 'max_length').nullable().optional(),
  category: z.string().max(50, 'max_length').nullable().optional(),
  intervalValue: z.number().int().min(1, 'min_interval'),
  intervalUnit: intervalUnitSchema,
  startDate: z.string().regex(DATE_REGEX, 'invalid_date'),
});

export type CreateChoreInput = z.infer<typeof createChoreSchema>;

// Editable fields for an existing chore. `intervalValue` and `intervalUnit`
// are immutable after creation (the backend would reject them) — to retune
// the rhythm the user moves `nextDueDate` directly.
export const updateChoreSchema = z.object({
  name: z.string().trim().min(1, 'required').max(100, 'max_length').optional(),
  notes: z.string().max(1000, 'max_length').nullable().optional(),
  category: z.string().max(50, 'max_length').nullable().optional(),
  nextDueDate: z.string().regex(DATE_REGEX, 'invalid_date').optional(),
});

export type UpdateChoreInput = z.infer<typeof updateChoreSchema>;

export const markChoreDoneSchema = z.object({
  doneAt: z.string().regex(DATE_REGEX, 'invalid_date').optional(),
  note: z.string().max(500, 'max_length').nullable().optional(),
});

export type MarkChoreDoneInput = z.infer<typeof markChoreDoneSchema>;
