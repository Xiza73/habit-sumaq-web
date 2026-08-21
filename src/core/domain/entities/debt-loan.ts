import { type Currency } from '@/core/domain/enums/currency.enum';

/**
 * Domain entity for a row in the v1.0.0 `debts_loans` module (introduced
 * by the `accounts-to-modular-finance` refactor — Phase A3-B on the
 * backend). Replaces the DEBT/LOAN subset of the legacy `transactions`
 * module.
 *
 * The contract lives canonically at
 * `habit-sumaq-backend/docs/frontend/api-reference.md#debts-and-loans`.
 *
 * Semantics:
 *   - Creating a DEBT/LOAN is NEUTRAL on the user's currency pool — no
 *     money moves at obligation-time.
 *   - Settling in **real-payment mode** (passing `currency` to the
 *     settle endpoint) debits or credits the pool depending on type.
 *   - Settling in **informal-close mode** (omitting `currency`) just
 *     marks the row SETTLED without touching the pool.
 */

export const DEBT_LOAN_TYPES = ['DEBT', 'LOAN'] as const;
export type DebtLoanType = (typeof DEBT_LOAN_TYPES)[number];

export const DEBT_LOAN_STATUSES = ['PENDING', 'SETTLED'] as const;
export type DebtLoanStatus = (typeof DEBT_LOAN_STATUSES)[number];

export const DEBT_LOAN_STATUS_FILTERS = ['pending', 'settled', 'all'] as const;
export type DebtLoanStatusFilter = (typeof DEBT_LOAN_STATUS_FILTERS)[number];

export interface DebtLoan {
  id: string;
  userId: string;
  type: DebtLoanType;
  currency: Currency;
  amount: number;
  remainingAmount: number;
  status: DebtLoanStatus;
  reference: string;
  description: string | null;
  categoryId: string | null;
  date: string; // ISO datetime
  createdAt: string;
  updatedAt: string;
}

/**
 * Row shape from GET /debts/summary. One per
 * `(LOWER(unaccent(reference)), currency)` pair. Juan-PEN and Juan-USD
 * are two separate rows — summing across currencies is meaningless.
 */
export interface DebtLoanSummaryRow {
  reference: string;
  currency: Currency;
  displayName: string;
  pendingDebt: number;
  pendingLoan: number;
  /** `pendingLoan - pendingDebt`. Positive = they owe you, negative = you owe them. */
  netOwed: number;
  pendingCount: number;
  settledCount: number;
}

/**
 * Result of POST /debts/settle-amount-by-reference. The backend distributes
 * the requested `amount` FIFO across the person's PENDING rows of ONE
 * `type`, so the response reports how many rows were fully vs partially
 * settled. `partiallySettledId` is the single row that absorbed the
 * leftover (or `null` when the amount closed rows exactly).
 */
export interface SettleAmountResult {
  settledCount: number;
  totalSettledAmount: number;
  fullySettledCount: number;
  partiallySettledId: string | null;
  currency: Currency;
  type: DebtLoanType;
}

/**
 * Row shape from `GET /debts/:id/payments`. One per settle event applied
 * to a debt/loan, ordered by `paidAt` DESC by the backend. `currency`
 * is `null` for informal-close settles (the settle didn't touch the pool).
 */
export interface DebtLoanPayment {
  id: string;
  amount: number;
  currency: Currency | null;
  note: string | null;
  /** When this row was written. Audit only — never edited. */
  createdAt: string;
  /**
   * When the money actually moved. This is the date the UI shows and the one
   * the user can correct; `createdAt` must not follow it.
   */
  paidAt: string;
}
