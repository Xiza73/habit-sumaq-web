/**
 * Domain entity for a row in `monthly_service_participants` — the optional
 * shared-service participant configuration. Lives in the `monthly-services`
 * backend module. Contract:
 * `habit-sumaq-backend/docs/frontend/api-reference.md#participantes-de-servicios-compartidos`.
 *
 * Semantics:
 *   - `reference` is matched against `debts_loans.reference` after
 *     server-side normalization (trim + lowercase + accent strip). The raw
 *     string persists as-is; normalization only affects duplicate detection.
 *   - `defaultAmount` is a suggested default for `POST
 *     /monthly-service-payments` splits — it does NOT lock the amount used
 *     per payment (see `MonthlyServicePaymentParticipant`).
 *   - `sum(defaultAmount)` across a service's participants cannot exceed the
 *     service's `estimatedAmount` when set (`MSP_PARTICIPANT_SUM_EXCEEDS_ESTIMATED`).
 */
export interface MonthlyServiceParticipant {
  id: string;
  monthlyServiceId: string;
  userId: string;
  reference: string;
  defaultAmount: number;
  createdAt: string;
  updatedAt: string;
}
