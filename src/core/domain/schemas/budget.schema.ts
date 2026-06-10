import { z } from 'zod/v4';

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
