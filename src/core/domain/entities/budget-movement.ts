import { type Currency } from '@/core/domain/enums/currency.enum';

/**
 * Domain entity for a row in the v1.0.0 `budget_movements` module
 * (introduced by the `accounts-to-modular-finance` refactor — Phase A4-B
 * on the backend). Replaces the EXPENSE subset of legacy `transactions`
 * rows where `budgetId IS NOT NULL`.
 *
 * The contract lives canonically at
 * `habit-sumaq-backend/docs/frontend/api-reference.md#budget-movements-v100`.
 *
 * Semantics:
 *   - Creating a movement DEBITS the user's currency pool by `amount`
 *     (atomic with the row save on the backend).
 *   - Updating the amount applies the diff to the pool.
 *   - Deleting a movement REFUNDS the pool by `amount` (unlike
 *     debts-loans, where delete is pool-neutral).
 *   - `budgetId`, `currency`, and `userId` are IMMUTABLE post-creation.
 *     To "move" a movement to another budget or currency, delete +
 *     recreate.
 *   - The movement's `date` must fall within the budget's `(year, month)`
 *     window (enforced server-side; the form should pre-validate).
 */
export interface BudgetMovement {
  id: string;
  userId: string;
  budgetId: string;
  currency: Currency;
  amount: number;
  description: string | null;
  categoryId: string | null;
  date: string; // ISO datetime
  createdAt: string;
  updatedAt: string;
}
