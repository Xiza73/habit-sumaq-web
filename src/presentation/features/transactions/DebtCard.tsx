'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { ArrowDownLeft, ArrowUpRight, User } from 'lucide-react';

import { type DebtsSummaryRow } from '@/core/domain/schemas/transaction.schema';

import { cn } from '@/lib/utils';

interface DebtCardProps {
  row: DebtsSummaryRow;
  onSettleAll?: (row: DebtsSummaryRow) => void;
}

function formatAmount(value: number): string {
  return value.toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function DebtCard({ row, onSettleAll }: DebtCardProps) {
  const t = useTranslations('transactions.debtsSummary');
  const hasDebt = row.pendingDebt > 0;
  const hasLoan = row.pendingLoan > 0;
  const hasAny = hasDebt || hasLoan;

  const netInYourFavor = row.netOwed > 0;
  const netAmount = Math.abs(row.netOwed);

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
          <p className="truncate font-medium">{row.displayName}</p>
          <p className="text-xs text-muted-foreground">
            {hasAny ? t('pendingCount', { count: row.pendingCount }) : t('allSettled')}
          </p>
        </div>
      </div>

      {!hasAny && (
        <div className="mt-4 rounded-md bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
          {t('allSettled')}
        </div>
      )}

      {hasAny && !hasDebt && (
        <div className="mt-4 flex items-end justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
            <ArrowDownLeft className="size-4" />
            {t('owesYou')}
          </div>
          <p className="font-mono text-xl font-bold tabular-nums text-green-700 dark:text-green-400">
            {formatAmount(row.pendingLoan)}
          </p>
        </div>
      )}

      {hasAny && hasDebt && !hasLoan && (
        <div className="mt-4 flex items-end justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <ArrowUpRight className="size-4" />
            {t('youOwe')}
          </div>
          <p className="font-mono text-xl font-bold tabular-nums text-destructive">
            {formatAmount(row.pendingDebt)}
          </p>
        </div>
      )}

      {hasDebt && hasLoan && (
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between tabular-nums">
            <span className="flex items-center gap-1.5 text-green-700 dark:text-green-400">
              <ArrowDownLeft className="size-3.5" />
              {t('owesYou')}
            </span>
            <span className="font-mono text-green-700 dark:text-green-400">
              {formatAmount(row.pendingLoan)}
            </span>
          </div>
          <div className="flex justify-between tabular-nums">
            <span className="flex items-center gap-1.5 text-destructive">
              <ArrowUpRight className="size-3.5" />
              {t('youOwe')}
            </span>
            <span className="font-mono text-destructive">{formatAmount(row.pendingDebt)}</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between border-t border-border pt-2">
            <span className="text-xs font-medium text-muted-foreground">{t('net')}</span>
            <div className="text-right">
              <p
                className={cn(
                  'font-mono text-lg font-bold tabular-nums',
                  netInYourFavor ? 'text-green-700 dark:text-green-400' : 'text-destructive',
                )}
              >
                {formatAmount(netAmount)}
              </p>
              <p className="text-xs text-muted-foreground">
                {netInYourFavor ? t('inYourFavor') : t('inTheirFavor')}
              </p>
            </div>
          </div>
        </div>
      )}

      {hasAny && onSettleAll && (
        <>
          {/* Spacer — in a grid, shorter cards need this so the button lands at
              the bottom edge instead of floating right below the last row. */}
          <div className="flex-1" />
          <button
            type="button"
            onClick={(e) => {
              // Prevent the parent <Link> from navigating when the user clicks
              // the button.
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
