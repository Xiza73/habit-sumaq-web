import { z } from 'zod/v4';

/**
 * Zod schemas for forms that hit the new `monthly_service_payments`
 * endpoints. The backend DTOs live at
 * `habit-sumaq-backend/src/modules/monthly-service-payments/application/dto/`;
 * these schemas mirror their validators so we reject bad input
 * client-side before the network hop.
 *
 * `currency` is NOT in the schemas — it's inherited from the monthly
 * service on the backend.
 *
 * `period` is mandatory on create and MUST match `YYYY-MM`. The same
 * regex runs server-side (DB CHECK + class-validator + use-case
 * `isValidPeriodFormat`), but rejecting client-side gives the form
 * an inline error before the network round-trip.
 */

const periodRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

export const createMonthlyServicePaymentSchema = z.object({
  monthlyServiceId: z.string().uuid('required'),
  period: z.string().regex(periodRegex, 'invalid_period_format'),
  amount: z.number().min(0.01, 'min_amount'),
  date: z.string().optional(),
  description: z.string().max(255).nullable().optional(),
});
export type CreateMonthlyServicePaymentInput = z.infer<typeof createMonthlyServicePaymentSchema>;

export const updateMonthlyServicePaymentSchema = z.object({
  amount: z.number().min(0.01, 'min_amount').optional(),
  date: z.string().optional(),
  description: z.string().max(255).nullable().optional(),
});
export type UpdateMonthlyServicePaymentInput = z.infer<typeof updateMonthlyServicePaymentSchema>;
