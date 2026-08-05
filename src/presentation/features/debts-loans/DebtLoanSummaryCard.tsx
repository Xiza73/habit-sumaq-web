'use client';

import { useTranslations } from 'next-intl';

import { ArrowDownLeft, ArrowUpRight, User } from 'lucide-react';

import { type DebtLoanSummaryRow, type DebtLoanType } from '@/core/domain/entities/debt-loan';

import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

interface DebtLoanSummaryCardProps {
  row: DebtLoanSummaryRow;
  onSettleAll?: (row: DebtLoanSummaryRow) => void;
  onClick?: (row: DebtLoanSummaryRow) => void;
  /**
   * Quick-create a debt/loan prefilled for this person. Renders the two
   * top-right corner buttons (↗ red = DEBT you owe, ↙ green = LOAN they owe
   * you) when provided.
   */
  onQuickAdd?: (row: DebtLoanSummaryRow, type: DebtLoanType) => void;
}

/**
 * Visual summary tile for a `(reference, currency)` group from the v1.0.0
 * `debts_loans` module. Mirrors the legacy `DebtCard` (same visual
 * design) but typed against the new domain entity and pulling i18n from
 * the `debts` namespace.
 */
export function DebtLoanSummaryCard({
  row,
  onSettleAll,
  onClick,
  onQuickAdd,
}: DebtLoanSummaryCardProps) {
  const t = useTranslations('debts.summary');
  const hasDebt = row.pendingDebt > 0;
  const hasLoan = row.pendingLoan > 0;
  const hasAny = hasDebt || hasLoan;

  const netInYourFavor = row.netOwed > 0;
  const netAmount = Math.abs(row.netOwed);
  const netIsZero = netAmount === 0;

  return (
    <div
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick ? () => onClick(row) : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(row);
              }
            }
          : undefined
      }
      className={cn(
        'group flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md',
        onClick &&
          'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <User className="size-5 text-muted-foreground" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold">{row.displayName}</span>
          <span className="text-xs text-muted-foreground">{row.currency}</span>
        </div>

        {onQuickAdd && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickAdd(row, 'DEBT');
              }}
              title={t('quickAdd.newDebt', { name: row.displayName })}
              aria-label={t('quickAdd.newDebt', { name: row.displayName })}
              className="inline-flex size-7 items-center justify-center rounded-md text-destructive transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ArrowUpRight className="size-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickAdd(row, 'LOAN');
              }}
              title={t('quickAdd.newLoan', { name: row.displayName })}
              aria-label={t('quickAdd.newLoan', { name: row.displayName })}
              className="inline-flex size-7 items-center justify-center rounded-md text-green-700 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-green-400"
            >
              <ArrowDownLeft className="size-3.5" aria-hidden />
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2 text-sm">
        {hasDebt && (
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <ArrowUpRight className="size-3.5 text-destructive" aria-hidden />
              {t('youOwe')}
            </span>
            <span className="font-medium text-destructive">
              {formatCurrency(row.pendingDebt, row.currency)}
            </span>
          </div>
        )}
        {hasLoan && (
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <ArrowDownLeft className="size-3.5 text-green-700 dark:text-green-400" aria-hidden />
              {t('theyOweYou')}
            </span>
            <span className="font-medium text-green-700 dark:text-green-400">
              {formatCurrency(row.pendingLoan, row.currency)}
            </span>
          </div>
        )}
        {!hasAny && <p className="text-xs italic text-muted-foreground">{t('allSettled')}</p>}
      </div>

      {hasAny && !netIsZero && (
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
          <span className="text-muted-foreground">{t('net')}</span>
          <span
            className={cn(
              'font-semibold',
              netInYourFavor ? 'text-green-700 dark:text-green-400' : 'text-destructive',
            )}
          >
            {netInYourFavor ? '+' : '-'}
            {formatCurrency(netAmount, row.currency)}
          </span>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {row.pendingCount > 0 && t('pendingCount', { count: row.pendingCount })}
          {row.pendingCount > 0 && row.settledCount > 0 && ' · '}
          {row.settledCount > 0 && t('settledCount', { count: row.settledCount })}
        </span>
        {onSettleAll && hasAny && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSettleAll(row);
            }}
            className="font-medium text-primary hover:underline"
          >
            {t('settleAll')}
          </button>
        )}
      </div>
    </div>
  );
}
