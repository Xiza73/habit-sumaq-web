'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { ArrowDownLeft, ArrowUpRight, User } from 'lucide-react';

import { type DebtsSummaryRow } from '@/core/domain/schemas/transaction.schema';

import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

interface DebtCardProps {
  row: DebtsSummaryRow;
  onSettleAll?: (row: DebtsSummaryRow) => void;
}

export function DebtCard({ row, onSettleAll }: DebtCardProps) {
  const t = useTranslations('transactions.debtsSummary');
  const hasDebt = row.pendingDebt > 0;
  const hasLoan = row.pendingLoan > 0;
  const hasAny = hasDebt || hasLoan;

  const netInYourFavor = row.netOwed > 0;
  const netAmount = Math.abs(row.netOwed);
  const netIsZero = netAmount === 0;

  // Link to the transactions list filtered by this person. Backend search is
  // accent/case-insensitive so the displayName always matches its transactions.
  const href = `/transactions?search=${encodeURIComponent(row.displayName)}&status=PENDING`;

  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <User className="size-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{row.displayName}</p>
            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {row.currency}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {hasAny ? t('pendingCount', { count: row.pendingCount }) : t('allSettled')}
          </p>
        </div>
      </div>

      {/* Unified 3-line layout — the shape of the card is the same regardless of
          whether the person has DEBT-only, LOAN-only, or both. Zero amounts are
          rendered as muted '—'. */}
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex items-center justify-between tabular-nums">
          <span
            className={cn(
              'flex items-center gap-1.5',
              hasLoan ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground',
            )}
          >
            <ArrowDownLeft className="size-3.5" />
            {t('owesYou')}
          </span>
          <span
            className={cn(
              'font-mono',
              hasLoan ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground',
            )}
          >
            {hasLoan ? formatCurrency(row.pendingLoan, row.currency) : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between tabular-nums">
          <span
            className={cn(
              'flex items-center gap-1.5',
              hasDebt ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            <ArrowUpRight className="size-3.5" />
            {t('youOwe')}
          </span>
          <span className={cn('font-mono', hasDebt ? 'text-destructive' : 'text-muted-foreground')}>
            {hasDebt ? formatCurrency(row.pendingDebt, row.currency) : '—'}
          </span>
        </div>
        <div className="flex items-baseline justify-between border-t border-border pt-2">
          <span className="text-xs font-medium text-muted-foreground">{t('net')}</span>
          <div className="text-right">
            <p
              className={cn(
                'font-mono text-lg font-bold tabular-nums',
                netIsZero
                  ? 'text-muted-foreground'
                  : netInYourFavor
                    ? 'text-green-700 dark:text-green-400'
                    : 'text-destructive',
              )}
            >
              {netIsZero ? '—' : formatCurrency(netAmount, row.currency)}
            </p>
            {!netIsZero && (
              <p className="text-xs text-muted-foreground">
                {netInYourFavor ? t('inYourFavor') : t('inTheirFavor')}
              </p>
            )}
          </div>
        </div>
      </div>

      {hasAny && onSettleAll && (
        <>
          <div className="flex-1" />
          <button
            type="button"
            onClick={(e) => {
              // Keep the parent <Link> from navigating when the user clicks the
              // button.
              e.preventDefault();
              e.stopPropagation();
              onSettleAll(row);
            }}
            className="mt-4 w-full rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {t('settleAll')}
          </button>
        </>
      )}
    </Link>
  );
}
