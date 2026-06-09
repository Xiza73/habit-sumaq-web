import { type Currency } from '@/core/domain/enums/currency.enum';

/**
 * Domain entity for a row in the v1.0.0 `monthly_service_payments`
 * module (Phase A4-B on the backend). Replaces the EXPENSE subset of
 * legacy `transactions` rows where `monthlyServiceId IS NOT NULL`.
 *
 * The contract lives canonically at
 * `habit-sumaq-backend/docs/frontend/api-reference.md#monthly-service-payments-v100`.
 *
 * Semantics:
 *   - `period` (YYYY-MM) is the period the payment is FOR. It is
 *     EXPLICIT, not derived from `date` — the user can back-pay or
 *     pay ahead.
 *   - `(monthlyServiceId, period)` is unique among non-deleted rows
 *     (DB-enforced). You can't pay the same service for the same
 *     period twice.
 *   - Creating a payment DEBITS the user's currency pool by `amount`.
 *   - Deleting a payment REFUNDS the pool by `amount`.
 *   - `userId`, `monthlyServiceId`, `currency`, `period` are
 *     IMMUTABLE post-creation. To change any, delete + recreate.
 */
export interface MonthlyServicePayment {
  id: string;
  userId: string;
  monthlyServiceId: string;
  currency: Currency;
  amount: number;
  /** YYYY-MM */
  period: string;
  description: string | null;
  /** Real calendar date the payment was made — distinct from `period`. */
  date: string; // ISO datetime
  createdAt: string;
  updatedAt: string;
}
