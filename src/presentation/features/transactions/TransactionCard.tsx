'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { HandCoins, MoreVertical, Pencil, Trash2 } from 'lucide-react';

import { type Transaction } from '@/core/domain/entities/transaction';
import { type Currency } from '@/core/domain/enums/account.enums';

import { formatCurrency } from '@/lib/format';
import { TRANSACTION_TYPE_COLORS, TRANSACTION_TYPE_ICONS } from '@/lib/transaction-icons';

interface TransactionCardProps {
  transaction: Transaction;
  currency: Currency;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onSettle?: (transaction: Transaction) => void;
}

export function TransactionCard({
  transaction,
  currency,
  onEdit,
  onDelete,
  onSettle,
}: TransactionCardProps) {
  const t = useTranslations('transactions');
  const [menuOpen, setMenuOpen] = useState(false);

  const Icon = TRANSACTION_TYPE_ICONS[transaction.type];
  const colorClass = TRANSACTION_TYPE_COLORS[transaction.type];
  const isSettled = transaction.status === 'SETTLED';
  const isDebtOrLoan = transaction.type === 'DEBT' || transaction.type === 'LOAN';
  const canSettle = isDebtOrLoan && transaction.status === 'PENDING';
  const canEdit = !isSettled;

  const amountPrefix =
    transaction.type === 'INCOME'
      ? '+'
      : transaction.type === 'EXPENSE' || transaction.type === 'TRANSFER'
        ? '-'
        : '';

  return (
    <div className="group relative flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
      <div
        className={`flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted ${colorClass}`}
      >
        <Icon className="size-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="min-w-0 truncate font-medium">
            {transaction.description ?? t('noDescription')}
          </p>
          {isDebtOrLoan && transaction.status && (
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                isSettled
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
              }`}
            >
              {t(`status.${transaction.status}`)}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {t(`types.${transaction.type}`)}
          {transaction.reference && ` · ${transaction.reference}`}
        </p>
        {isDebtOrLoan &&
          transaction.remainingAmount !== null &&
          transaction.remainingAmount > 0 && (
            <p className="text-xs text-muted-foreground">
              {t('remaining')}: {formatCurrency(transaction.remainingAmount, currency)}
            </p>
          )}
      </div>

      <div className="shrink-0 text-right">
        <p className={`font-semibold tabular-nums ${colorClass}`}>
          {amountPrefix}
          {formatCurrency(transaction.amount, currency)}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(transaction.date).toLocaleDateString()}
        </p>
      </div>

      <div className="absolute right-3 top-3">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
          aria-label="Transaction actions"
        >
          <MoreVertical className="size-4" />
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setMenuOpen(false);
              }}
              role="button"
              tabIndex={0}
              aria-label="Close menu"
            />
            <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-border bg-popover py-1 shadow-lg">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(transaction);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                >
                  <Pencil className="size-4" />
                  {t('editTransaction')}
                </button>
              )}
              {canSettle && onSettle && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onSettle(transaction);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                >
                  <HandCoins className="size-4" />
                  {t('settle')}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(transaction);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted"
              >
                <Trash2 className="size-4" />
                {t('deleteTransaction')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
