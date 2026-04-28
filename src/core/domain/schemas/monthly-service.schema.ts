import { z } from 'zod/v4';

import { MONTHLY_SERVICE_FREQUENCIES } from '@/core/domain/entities/monthly-service';

const PERIOD_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Refine without a type predicate so the schema's output stays as `number |
// undefined`. Narrowing it to `1|3|6|12` would tighten the inferred form
// shape, which the RHF resolver can't match against the entity field that
// stores the raw number.
const frequencyMonthsSchema = z
  .number()
  .int()
  .refine((v) => (MONTHLY_SERVICE_FREQUENCIES as readonly number[]).includes(v), {
    message: 'invalid_frequency',
  })
  .optional();

export const createMonthlyServiceSchema = z.object({
  name: z.string().min(1, 'required').max(100, 'max_length'),
  defaultAccountId: z.string().regex(UUID_REGEX, 'invalid_uuid'),
  categoryId: z.string().regex(UUID_REGEX, 'invalid_uuid'),
  currency: z.string().length(3, 'invalid_currency'),
  frequencyMonths: frequencyMonthsSchema,
  estimatedAmount: z.number().positive('min_amount').nullable().optional(),
  dueDay: z.number().int().min(1).max(31).nullable().optional(),
  startPeriod: z.string().regex(PERIOD_REGEX, 'invalid_period').optional(),
});

export type CreateMonthlyServiceInput = z.infer<typeof createMonthlyServiceSchema>;

// Editable fields only — `currency` and `startPeriod` are immutable after creation.
export const updateMonthlyServiceSchema = z.object({
  name: z.string().min(1, 'required').max(100, 'max_length').optional(),
  defaultAccountId: z.string().regex(UUID_REGEX, 'invalid_uuid').optional(),
  categoryId: z.string().regex(UUID_REGEX, 'invalid_uuid').optional(),
  estimatedAmount: z.number().positive('min_amount').nullable().optional(),
  dueDay: z.number().int().min(1).max(31).nullable().optional(),
});

export type UpdateMonthlyServiceInput = z.infer<typeof updateMonthlyServiceSchema>;

export const payMonthlyServiceSchema = z.object({
  amount: z.number().positive('min_amount'),
  date: z.string().min(1).optional(),
  description: z.string().max(255).nullable().optional(),
  accountIdOverride: z.string().regex(UUID_REGEX, 'invalid_uuid').optional(),
});

export type PayMonthlyServiceInput = z.infer<typeof payMonthlyServiceSchema>;
