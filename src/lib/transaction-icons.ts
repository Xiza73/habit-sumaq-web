import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  HandCoins,
  type LucideIcon,
  Wallet,
} from 'lucide-react';

import { type TransactionType } from '@/core/domain/enums/transaction.enums';

export const TRANSACTION_TYPE_ICONS: Record<TransactionType, LucideIcon> = {
  INCOME: ArrowDownLeft,
  EXPENSE: ArrowUpRight,
  TRANSFER: ArrowRightLeft,
  DEBT: HandCoins,
  LOAN: Wallet,
};

export const TRANSACTION_TYPE_COLORS: Record<TransactionType, string> = {
  INCOME: 'text-green-600 dark:text-green-400',
  EXPENSE: 'text-red-600 dark:text-red-400',
  TRANSFER: 'text-blue-600 dark:text-blue-400',
  DEBT: 'text-orange-600 dark:text-orange-400',
  LOAN: 'text-purple-600 dark:text-purple-400',
};
