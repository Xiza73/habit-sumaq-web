import { z } from 'zod/v4';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const currencySchema = z.enum(['PEN', 'USD', 'EUR']);

export const createBudgetSchema = z.object({
  /** Optional — backend defaults to current year in the client timezone. */
  year: z.number().int().min(2000).max(2100).optional(),
  /** Optional — backend defaults to current month (1-12) in the client timezone. */
  month: z.number().int().min(1).max(12).optional(),
  currency: currencySchema,
  amount: z.number().positive('min_amount'),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;

/**
 * Update only allows changing `amount` — year/month/currency are immutable on
 * the backend (would orphan the linked movements). The form disables those
 * fields when in edit mode.
 */
export const updateBudgetSchema = z.object({
  amount: z.number().positive('min_amount'),
});

export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;

export const addBudgetMovementSchema = z.object({
  amount: z.number().positive('min_amount'),
  accountId: z.string().regex(UUID_REGEX, 'invalid_uuid'),
  categoryId: z.string().regex(UUID_REGEX, 'invalid_uuid'),
  /** YYYY-MM-DD — must fall inside the budget's calendar month. */
  date: z.string().min(1, 'required'),
  description: z.string().max(255).nullable().optional(),
});

export type AddBudgetMovementInput = z.infer<typeof addBudgetMovementSchema>;
