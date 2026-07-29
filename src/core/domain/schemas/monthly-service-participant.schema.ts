import { z } from 'zod/v4';

/**
 * Zod schemas for the shared-service participant config endpoints
 * (`/monthly-services/:id/participants[...]`). Mirrors the backend DTOs
 * documented at
 * `habit-sumaq-backend/docs/frontend/api-reference.md#participantes-de-servicios-compartidos`.
 *
 * `reference` is matched against `debts_loans.reference` after backend-side
 * normalization (trim + lowercase + accent strip) — the raw string is sent
 * as-is, normalization is server-side only.
 */

export const addMonthlyServiceParticipantSchema = z.object({
  reference: z.string().min(1, 'required').max(255, 'max_length'),
  defaultAmount: z.number().positive('min_amount'),
});
export type AddMonthlyServiceParticipantInput = z.infer<typeof addMonthlyServiceParticipantSchema>;

export const updateMonthlyServiceParticipantSchema = z.object({
  defaultAmount: z.number().positive('min_amount'),
});
export type UpdateMonthlyServiceParticipantInput = z.infer<
  typeof updateMonthlyServiceParticipantSchema
>;
