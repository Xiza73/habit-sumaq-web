import { z } from 'zod/v4';

/**
 * Zod schemas for forms that hit the new `debts_loans` endpoints. The
 * backend DTOs live at
 * `habit-sumaq-backend/src/modules/debts-loans/application/dto/`; these
 * schemas mirror their validators so we reject bad input client-side
 * before the network hop.
 */

const currencySchema = z.enum(['PEN', 'USD', 'EUR']);

export const createDebtLoanSchema = z.object({
  type: z.enum(['DEBT', 'LOAN']),
  currency: currencySchema,
  amount: z.number().min(0.01, 'min_amount'),
  reference: z.string().min(1, 'required').max(255),
  description: z.string().max(255).nullable().optional(),
  date: z.string().optional(),
  categoryId: z.string().uuid().optional(),
});
export type CreateDebtLoanInput = z.infer<typeof createDebtLoanSchema>;

export const updateDebtLoanSchema = z.object({
  amount: z.number().min(0.01, 'min_amount').optional(),
  description: z.string().max(255).nullable().optional(),
  date: z.string().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  reference: z.string().min(1, 'required').max(255).optional(),
});
export type UpdateDebtLoanInput = z.infer<typeof updateDebtLoanSchema>;

export const settleDebtLoanSchema = z.object({
  settledAmount: z.number().min(0.01, 'min_amount'),
  /** Presencia → real-payment; ausencia → informal-close. */
  currency: currencySchema.optional(),
});
export type SettleDebtLoanInput = z.infer<typeof settleDebtLoanSchema>;

export const bulkSettleByReferenceSchema = z.object({
  reference: z.string().min(1, 'required').max(255),
  currency: currencySchema.optional(),
});
export type BulkSettleByReferenceInput = z.infer<typeof bulkSettleByReferenceSchema>;

/**
 * PATCH /debts/payments/:paymentId — edit amount and/or note of a
 * payment in the history. The backend enforces "at least one field"
 * (DBT_009); we mirror it via `.refine` so the form rejects empty
 * submits before the network hop.
 *
 * `currency` is immutable post-creation by design — settles that hit
 * the pool can't switch currencies without unwinding the delta, and the
 * UI never exposes a currency editor here.
 */
export const updateDebtLoanPaymentSchema = z
  .object({
    amount: z.number().min(0.01, 'min_amount').optional(),
    note: z.string().max(255).nullable().optional(),
  })
  .refine((v) => v.amount !== undefined || v.note !== undefined, {
    message: 'at_least_one_field',
  });
export type UpdateDebtLoanPaymentInput = z.infer<typeof updateDebtLoanPaymentSchema>;
