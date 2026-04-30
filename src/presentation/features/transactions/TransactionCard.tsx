'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { HandCoins, MoreVertical, Pencil, PiggyBank, Trash2 } from 'lucide-react';

import { type Transaction } from '@/core/domain/entities/transaction';
import { type Currency } from '@/core/domain/enums/account.enums';

import { formatCurrency, getOnlyDateFromApi } from '@/lib/format';
import { TRANSACTION_TYPE_COLORS, TRANSACTION_TYPE_ICONS } from '@/lib/transaction-icons';
import { cn } from '@/lib/utils';

interface TransactionCardProps {
  transaction: Transaction;
  currency: Currency;
  isLast?: boolean;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onSettle?: (transaction: Transaction) => void;
}

export function TransactionCard({
  transaction,
  currency,
  isLast,
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

  // Partial payment = remaining strictly between 0 and total. In that case we
  // flip the visual hierarchy: remaining is the headline number, total drops
  // to a small "de {total}" caption. Full pending (remaining === total) and
  // fully settled (remaining === 0) keep the regular layout.
  const isPartiallyPaid =
    isDebtOrLoan &&
    transaction.remainingAmount !== null &&
    transaction.remainingAmount > 0 &&
    transaction.remainingAmount < transaction.amount;

  const amountPrefix =
    transaction.type === 'INCOME'
      ? '+'
      : transaction.type === 'EXPENSE' || transaction.type === 'TRANSFER'
        ? '-'
        : '';

  return (
    <div className="group relative flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
      {/* Touch devices: whole card is tappable */}
      <button
        type="button"
        className="absolute inset-0 z-0 hover-device-hidden"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Transaction actions"
      />

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
          {/* Budget movement marker — lets the user spot expenses tagged to
              a monthly budget at a glance in the global tx list. */}
          {transaction.budgetId && (
            <span
              className="inline-flex shrink-0 items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
              title={t('budgetBadgeTitle')}
            >
              <PiggyBank className="size-2.5" />
              {t('budgetBadge')}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {t(`types.${transaction.type}`)}
          {transaction.reference && ` · ${transaction.reference}`}
        </p>
      </div>

      <div className="shrink-0 text-right">
        {isPartiallyPaid ? (
          <>
            <p className={`font-semibold tabular-nums ${colorClass}`}>
              {amountPrefix}
              {/* Non-null asserted: isPartiallyPaid already gates remainingAmount !== null */}
              {formatCurrency(transaction.remainingAmount as number, currency)}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {t('ofTotal', { total: formatCurrency(transaction.amount, currency) })}
            </p>
          </>
        ) : (
          <p className={`font-semibold tabular-nums ${colorClass}`}>
            {amountPrefix}
            {formatCurrency(transaction.amount, currency)}
          </p>
        )}
        <p className="text-xs text-muted-foreground">{getOnlyDateFromApi(transaction.date)}</p>
      </div>

      {/* Hover devices: 3-dot button appears in flow only on hover */}
      <div className="hidden w-0 shrink-0 overflow-hidden transition-all group-hover:w-7 hover-device-block">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
          aria-label="Transaction actions"
        >
          <MoreVertical className="size-4" />
        </button>
      </div>

      {/* Actions dropdown */}
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
          <div
            className={cn(
              'absolute right-4 top-full z-20 mt-1 w-48 rounded-lg border border-border bg-popover py-1 shadow-lg md:right-0',
              isLast && 'top-1/2 -translate-y-1/2',
            )}
          >
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
  );
}
