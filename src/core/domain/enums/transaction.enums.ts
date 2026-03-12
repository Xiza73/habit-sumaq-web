export const TransactionType = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
  TRANSFER: 'TRANSFER',
  DEBT: 'DEBT',
  LOAN: 'LOAN',
} as const;

export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

export const TransactionStatus = {
  PENDING: 'PENDING',
  SETTLED: 'SETTLED',
} as const;

export type TransactionStatus = (typeof TransactionStatus)[keyof typeof TransactionStatus];
