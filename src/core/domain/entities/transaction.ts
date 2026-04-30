import {
  type TransactionStatus,
  type TransactionType,
} from '@/core/domain/enums/transaction.enums';

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  categoryId: string | null;
  type: TransactionType;
  amount: number;
  description: string | null;
  date: string;
  destinationAccountId: string | null;
  reference: string | null;
  status: TransactionStatus | null;
  relatedTransactionId: string | null;
  remainingAmount: number | null;
  /**
   * UUID of the budget this expense is tagged to (only for EXPENSE created via
   * `POST /budgets/:id/movements`). Null for everything else. The frontend
   * uses this to render a small "Budget" badge in the transactions list so
   * the user can tell budget movements apart from regular expenses.
   */
  budgetId: string | null;
  createdAt: string;
  updatedAt: string;
}
