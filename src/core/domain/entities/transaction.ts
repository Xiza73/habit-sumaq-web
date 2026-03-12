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
  createdAt: string;
  updatedAt: string;
}
