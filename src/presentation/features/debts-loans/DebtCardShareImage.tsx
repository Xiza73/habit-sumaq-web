'use client';

import { forwardRef } from 'react';
import { useTranslations } from 'next-intl';

import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

import { useDateFormat } from '@/core/application/hooks/use-user-settings';
import { type DebtLoanSummaryRow } from '@/core/domain/entities/debt-loan';

import { formatCurrency, formatDate, getTodayLocaleDate } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Solid background painted into the exported PNG. Kept in sync with the
 * card's own `bg-white` so the download and the on-screen node match. */
export const SHARE_IMAGE_BACKGROUND = '#ffffff';

interface DebtCardShareImageProps {
  row: DebtLoanSummaryRow;
}

/**
 * Image-friendly, NON-interactive rendition of a person's debt/loan
 * summary, meant to be rasterized to PNG (copy / download) by
 * `useExportNodeImage`. It mirrors `DebtLoanSummaryCard`'s color
 * conventions — ArrowUpRight red = debt you owe, ArrowDownLeft green =
 * loan they owe you — but uses fixed light-theme colors so the exported
 * image reads the same regardless of the viewer's active theme.
 *
 * Rendered off-screen (never `display:none`) so `html-to-image` can lay it
 * out. The wrapper handles the off-screen positioning; this node provides
 * the fixed width, padding and solid background captured in the PNG.
 */
export const DebtCardShareImage = forwardRef<HTMLDivElement, DebtCardShareImageProps>(
  function DebtCardShareImage({ row }, ref) {
    const t = useTranslations('debts.summary');
    const dateFormat = useDateFormat();

    const hasDebt = row.pendingDebt > 0;
    const hasLoan = row.pendingLoan > 0;
    const hasAny = hasDebt || hasLoan;

    const netInYourFavor = row.netOwed > 0;
    const netAmount = Math.abs(row.netOwed);
    const netIsZero = netAmount === 0;

    return (
      <div
        ref={ref}
        className="flex w-[360px] flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-lg font-semibold text-zinc-600">
            {row.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-base font-semibold text-zinc-900">
              {row.displayName}
            </span>
            <span className="mt-0.5 inline-flex w-fit rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
              {row.currency}
            </span>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          {hasDebt && (
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-zinc-500">
                <ArrowUpRight className="size-3.5 text-red-600" aria-hidden />
                {t('youOwe')}
              </span>
              <span className="font-medium text-red-600">
                {formatCurrency(row.pendingDebt, row.currency)}
              </span>
            </div>
          )}
          {hasLoan && (
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-zinc-500">
                <ArrowDownLeft className="size-3.5 text-green-600" aria-hidden />
                {t('theyOweYou')}
              </span>
              <span className="font-medium text-green-600">
                {formatCurrency(row.pendingLoan, row.currency)}
              </span>
            </div>
          )}
          {!hasAny && <p className="text-xs italic text-zinc-400">{t('allSettled')}</p>}
        </div>

        {hasAny && !netIsZero && (
          <div className="flex items-center justify-between border-t border-zinc-200 pt-3 text-sm">
            <span className="text-zinc-500">{t('net')}</span>
            <span
              className={cn('font-semibold', netInYourFavor ? 'text-green-600' : 'text-red-600')}
            >
              {netInYourFavor ? '+' : '-'}
              {formatCurrency(netAmount, row.currency)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-zinc-100 pt-3 text-xs text-zinc-400">
          <span className="font-medium text-zinc-500">Habit Sumaq</span>
          <span>{formatDate(getTodayLocaleDate(), dateFormat)}</span>
        </div>
      </div>
    );
  },
);
