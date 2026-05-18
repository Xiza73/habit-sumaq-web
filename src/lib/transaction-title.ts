import { type Category } from '@/core/domain/entities/category';
import { type Transaction } from '@/core/domain/entities/transaction';
import { type TransactionType } from '@/core/domain/enums/transaction.enums';

/**
 * Three-layer fallback for the display title of a transaction (or
 * budget movement, debt payment, etc. — anything backed by a Transaction).
 *
 *   1. explicit `description` — what the user typed
 *   2. category name — "Comida", "Sueldo", "Servicios" …
 *   3. localized type label — "Gasto", "Ingreso", "Transferencia" …
 *
 * The old behaviour was to render a flat "Sin descripción" / "No description"
 * placeholder when the description was empty. That was user-hostile because
 * most transactions DO have a category that already names them well — the
 * UI should reach for that name before giving up on the user.
 *
 * Any surface that renders a transaction (TransactionCard, BudgetMovementList,
 * future reports, etc.) MUST go through this helper so the fallback chain
 * stays consistent across the app. See
 * [business-rules.md](docs/frontend/business-rules.md#transaction-display-title).
 *
 * The helper is locale-agnostic — the caller passes a `getTypeLabel` resolver
 * (typically `(type) => t(`types.${type}`)`) so this stays trivially testable
 * without mocking next-intl.
 */
export function getTransactionDisplayTitle(
  transaction: Pick<Transaction, 'description' | 'type'>,
  category: Pick<Category, 'name'> | null | undefined,
  getTypeLabel: (type: TransactionType) => string,
): string {
  if (transaction.description) return transaction.description;
  if (category?.name) return category.name;
  return getTypeLabel(transaction.type);
}
