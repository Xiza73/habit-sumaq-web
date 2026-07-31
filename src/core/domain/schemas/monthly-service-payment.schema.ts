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

/**
 * One split of a shared-service payment (`POST /monthly-service-payments`
 * body's `participants[]`). `reference` does NOT have to match a configured
 * `MonthlyServiceParticipant` — it's used verbatim to create the linked
 * `LOAN`. `alreadyPaid` defaults to `false` (stays `PENDING`); `true`
 * creates AND settles the loan in the same backend transaction.
 *
 * The backend rejects (`MSP_010`) if `sum(participants[].amount) >
 * amount` — that cross-field check is NOT duplicated here (it needs the
 * sibling `amount` field and is validated server-side before any write);
 * this schema only guards the shape of each row.
 */
export const monthlyServicePaymentParticipantSchema = z.object({
  reference: z.string().min(1, 'required').max(255, 'max_length'),
  amount: z.number().min(0.01, 'min_amount'),
  // `.optional()` only (no `.default()`) so the inferred type stays
  // `boolean | undefined` instead of tightening to `boolean` — same
  // reasoning as `frequencyMonthsSchema` in monthly-service.schema.ts:
  // the RHF resolver must match the form field's declared shape, and the
  // backend already defaults `alreadyPaid` to `false` when omitted.
  alreadyPaid: z.boolean().optional(),
});
export type MonthlyServicePaymentParticipantInput = z.infer<
  typeof monthlyServicePaymentParticipantSchema
>;

export const createMonthlyServicePaymentSchema = z.object({
  monthlyServiceId: z.string().uuid('required'),
  period: z.string().regex(periodRegex, 'invalid_period_format'),
  amount: z.number().min(0.01, 'min_amount'),
  date: z.string().optional(),
  description: z.string().max(255).nullable().optional(),
  /**
   * Splits for shared services. Omitted or `[]` behaves exactly like a
   * non-shared payment — no LOAN rows are generated (unchanged behavior).
   */
  participants: z.array(monthlyServicePaymentParticipantSchema).optional(),
});
export type CreateMonthlyServicePaymentInput = z.infer<typeof createMonthlyServicePaymentSchema>;

export const updateMonthlyServicePaymentSchema = z.object({
  amount: z.number().min(0.01, 'min_amount').optional(),
  date: z.string().optional(),
  description: z.string().max(255).nullable().optional(),
});
export type UpdateMonthlyServicePaymentInput = z.infer<typeof updateMonthlyServicePaymentSchema>;
