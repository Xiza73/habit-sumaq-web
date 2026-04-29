import { z } from 'zod/v4';

import { type Currency } from '@/core/domain/enums/account.enums';

export const createTransactionSchema = z
  .object({
    accountId: z.string().min(1, 'required'),
    categoryId: z.string().nullable().optional(),
    type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'DEBT', 'LOAN']),
    amount: z.number().min(0.01, 'min_amount'),
    description: z.string().max(255).nullable().optional(),
    date: z.string().min(1, 'required'),
    destinationAccountId: z.string().nullable().optional(),
    reference: z.string().max(255).nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'TRANSFER') return !!data.destinationAccountId;
      return true;
    },
    { path: ['destinationAccountId'], message: 'required_for_transfer' },
  )
  .refine(
    (data) => {
      if (data.type === 'TRANSFER') return data.accountId !== data.destinationAccountId;
      return true;
    },
    { path: ['destinationAccountId'], message: 'same_account' },
  )
  .refine(
    (data) => {
      if (data.type === 'DEBT' || data.type === 'LOAN') return !!data.reference;
      return true;
    },
    { path: ['reference'], message: 'required_for_debt_loan' },
  );

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const updateTransactionSchema = z.object({
  categoryId: z.string().nullable().optional(),
  amount: z.number().min(0.01, 'min_amount').optional(),
  description: z.string().max(255).nullable().optional(),
  date: z.string().optional(),
  reference: z.string().max(255).nullable().optional(),
});

export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

export const settleTransactionSchema = z.object({
  accountId: z.string().min(1, 'required'),
  amount: z.number().min(0.01, 'min_amount'),
  description: z.string().max(255).nullable().optional(),
  date: z.string().optional(),
});

export type SettleTransactionInput = z.infer<typeof settleTransactionSchema>;

export interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  type?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  /** Substring match — backend applies unaccent + ILIKE on description and reference. */
  search?: string;
}

export type DebtsSummaryStatusFilter = 'pending' | 'all' | 'settled';

export interface DebtsSummaryRow {
  /** Normalized reference (lowercase + unaccented). Part of grouping key. */
  reference: string;
  /** Currency of the underlying account (PEN/USD/EUR). Part of grouping key. */
  currency: Currency;
  /** Most-recent spelling of this reference. */
  displayName: string;
  /** Sum of remaining amounts for pending DEBT (what the user owes). */
  pendingDebt: number;
  /** Sum of remaining amounts for pending LOAN (what is owed to the user). */
  pendingLoan: number;
  /** `pendingLoan - pendingDebt`. Positive = owed to the user. */
  netOwed: number;
  pendingCount: number;
  settledCount: number;
}

export interface BulkSettleResult {
  settledIds: string[];
  totalSettled: number;
  count: number;
  /** New EXPENSE/INCOME settlement transactions created in real-payment mode. Empty in informal mode. */
  settlementIds: string[];
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const settleByReferenceSchema = z.object({
  reference: z.string().min(1, 'required').max(255),
  /** Optional — narrows bulk settle to a single currency bucket. */
  currency: z.enum(['PEN', 'USD', 'EUR']).optional(),
  /**
   * When set, the bulk settle runs in **real-payment mode**: per pending tx
   * creates a settlement (EXPENSE for DEBT, INCOME for LOAN) on this account
   * and moves the balance. When omitted, runs in **informal mode**: only
   * marks SETTLED, no movement.
   */
  accountId: z.string().regex(UUID_REGEX, 'invalid_uuid').optional(),
});

export type SettleByReferenceInput = z.infer<typeof settleByReferenceSchema>;
