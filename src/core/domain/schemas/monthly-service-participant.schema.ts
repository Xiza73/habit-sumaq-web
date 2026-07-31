import { z } from 'zod/v4';

/**
 * Zod schemas for the shared-service participant BATCH replace model
 * (`PUT /monthly-services/:id/participants` and the optional
 * `participants[]` on `POST /monthly-services`). Mirrors the backend DTOs
 * documented at
 * `habit-sumaq-backend/docs/frontend/api-reference.md#participantes-de-servicios-compartidos`.
 *
 * `reference` is matched against `debts_loans.reference` after backend-side
 * normalization (trim + lowercase + accent strip) — the raw string is sent
 * as-is, normalization is server-side only.
 *
 * The cross-field `sum(defaultAmount) <= estimatedAmount` check and the
 * within-batch duplicate-reference check are NOT duplicated client-side —
 * both need context (the service's `estimatedAmount`, or comparing every
 * row against every other row) that's cheaper to validate once, server-side,
 * and surface via the error interceptor
 * (`MSP_PARTICIPANT_SUM_EXCEEDS_ESTIMATED` / `MSP_PARTICIPANT_DUPLICATE_REFERENCE`).
 */

export const monthlyServiceParticipantRowSchema = z.object({
  reference: z.string().min(1, 'required').max(255, 'max_length'),
  defaultAmount: z.number().positive('min_amount'),
});
export type MonthlyServiceParticipantRowInput = z.infer<typeof monthlyServiceParticipantRowSchema>;

/** Body for `PUT /monthly-services/:id/participants` — replaces the whole active list. */
export const replaceMonthlyServiceParticipantsSchema = z.object({
  participants: z.array(monthlyServiceParticipantRowSchema),
});
export type ReplaceMonthlyServiceParticipantsInput = z.infer<
  typeof replaceMonthlyServiceParticipantsSchema
>;
