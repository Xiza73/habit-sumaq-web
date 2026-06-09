import { z } from 'zod/v4';

/**
 * Zod schemas for forms that hit the new `budget_movements` endpoints.
 * The backend DTOs live at
 * `habit-sumaq-backend/src/modules/budget-movements/application/dto/`;
 * these schemas mirror their validators so we reject bad input
 * client-side before the network hop.
 *
 * `currency` is NOT in the create schema — it's inherited from the
 * budget on the backend (the budget owns the currency, not the
 * movement). `budgetId` and `currency` are immutable, so the update
 * schema doesn't expose them either.
 */

export const createBudgetMovementSchema = z.object({
  budgetId: z.string().uuid('required'),
  amount: z.number().min(0.01, 'min_amount'),
  date: z.string().optional(),
  description: z.string().max(255).nullable().optional(),
  categoryId: z.string().uuid().optional(),
});
export type CreateBudgetMovementInput = z.infer<typeof createBudgetMovementSchema>;

export const updateBudgetMovementSchema = z.object({
  amount: z.number().min(0.01, 'min_amount').optional(),
  date: z.string().optional(),
  description: z.string().max(255).nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
});
export type UpdateBudgetMovementInput = z.infer<typeof updateBudgetMovementSchema>;
