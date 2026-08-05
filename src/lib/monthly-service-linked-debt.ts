import { type DebtLoan } from '@/core/domain/entities/debt-loan';
import { type LinkedDebt, type MonthlyService } from '@/core/domain/entities/monthly-service';

/**
 * `DebtLoanRowSettleModal` (and `useSettleDebtLoan`) expect a full `DebtLoan`.
 * A `LinkedDebt` only carries the fields the monthly-services response exposes
 * (`id`, `reference`, `remainingAmount`, `status`) — this adapts one into a
 * `DebtLoan`-shaped object so the settle flow can be reused unchanged from BOTH
 * the card and the table. Only `id`, `reference`, `remainingAmount`, `currency`,
 * and `status` are actually read by the modal/mutation; the rest are
 * placeholders that satisfy the type but are never rendered or sent.
 */
export function toSettleableDebtLoan(linkedDebt: LinkedDebt, service: MonthlyService): DebtLoan {
  return {
    id: linkedDebt.id,
    userId: service.userId,
    type: 'LOAN',
    currency: service.currency,
    amount: linkedDebt.remainingAmount,
    remainingAmount: linkedDebt.remainingAmount,
    status: linkedDebt.status,
    reference: linkedDebt.reference,
    description: null,
    categoryId: null,
    date: service.updatedAt,
    createdAt: service.updatedAt,
    updatedAt: service.updatedAt,
  };
}
