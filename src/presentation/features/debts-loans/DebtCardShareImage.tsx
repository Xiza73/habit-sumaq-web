'use client';

import { forwardRef } from 'react';
import { useTranslations } from 'next-intl';

import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

import { useDateFormat } from '@/core/application/hooks/use-user-settings';
import { type DebtLoan, type DebtLoanSummaryRow } from '@/core/domain/entities/debt-loan';

import { formatCurrency, formatDate, getTodayLocaleDate } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Solid background painted into the exported PNG. Kept in sync with the
 * card's own `bg-white` so the download and the on-screen node match. */
export const SHARE_IMAGE_BACKGROUND = '#ffffff';

/**
 * Cap on the number of individual pending rows rendered in the exported
 * image. It's a snapshot, not a ledger — past ~8 lines the image stops
 * being scannable, so any overflow collapses into a single "y N más" line
 * and the Total still reflects the whole group (it comes from the summary,
 * not from summing the visible lines).
 */
const MAX_VISIBLE_ROWS = 8;

interface DebtCardShareImageProps {
  /** Summary row — source of the person name, currency and group total. */
  row: DebtLoanSummaryRow;
  /** Individual PENDING debt/loan rows for the `(reference, currency)` group. */
  rows: DebtLoan[];
}

/**
 * Image-friendly, NON-interactive rendition of a person's PENDING
 * debts/loans, meant to be rasterized to PNG (copy / download) by
 * `useExportNodeImage`. Unlike the summary card, it lists the person's
 * INDIVIDUAL pending rows — one line each (date · description · amount),
 * colored by type (ArrowUpRight red = a debt you owe, ArrowDownLeft green
 * = a loan they owe you) — and closes with the group Total (the summary's
 * `netOwed`, i.e. who ends up owing whom).
 *
 * Per-line amounts use `remainingAmount` (the still-open figure), so a
 * partially-settled row shows what's actually pending rather than its
 * original amount.
 *
 * Uses fixed light-theme colors so the exported image reads the same
 * regardless of the viewer's active theme. Rendered off-screen (never
 * `display:none`) so `html-to-image` can lay it out; the wrapper handles
 * the off-screen positioning while this node provides the fixed width,
 * padding and solid background captured in the PNG.
 */
export const DebtCardShareImage = forwardRef<HTMLDivElement, DebtCardShareImageProps>(
  function DebtCardShareImage({ row, rows }, ref) {
    const t = useTranslations('debts.summary');
    const dateFormat = useDateFormat();

    const visibleRows = rows.slice(0, MAX_VISIBLE_ROWS);
    const hiddenCount = rows.length - visibleRows.length;

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

        {visibleRows.length === 0 ? (
          <p className="text-xs italic text-zinc-400">{t('allSettled')}</p>
        ) : (
          <ul className="space-y-2">
            {visibleRows.map((item) => {
              const isDebt = item.type === 'DEBT';
              return (
                <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    {isDebt ? (
                      <ArrowUpRight className="size-3.5 shrink-0 text-red-600" aria-hidden />
                    ) : (
                      <ArrowDownLeft className="size-3.5 shrink-0 text-green-600" aria-hidden />
                    )}
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-zinc-700">
                        {item.description || row.displayName}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {formatDate(item.date, dateFormat)}
                      </span>
                    </span>
                  </span>
                  <span
                    className={cn(
                      'shrink-0 font-medium',
                      isDebt ? 'text-red-600' : 'text-green-600',
                    )}
                  >
                    {formatCurrency(item.remainingAmount, item.currency)}
                  </span>
                </li>
              );
            })}
            {hiddenCount > 0 && (
              <li className="text-xs italic text-zinc-400">
                {t('andMore', { count: hiddenCount })}
              </li>
            )}
          </ul>
        )}

        <div className="flex items-center justify-between border-t border-zinc-200 pt-3 text-sm">
          <span className="font-medium text-zinc-500">{t('total')}</span>
          {netIsZero ? (
            <span className="text-zinc-400">{t('allSettled')}</span>
          ) : (
            <span
              className={cn('font-semibold', netInYourFavor ? 'text-green-600' : 'text-red-600')}
            >
              {netInYourFavor ? t('theyOweYou') : t('youOwe')}{' '}
              {formatCurrency(netAmount, row.currency)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-zinc-100 pt-3 text-xs text-zinc-400">
          <span className="font-medium text-zinc-500">Habit Sumaq</span>
          <span>{formatDate(getTodayLocaleDate(), dateFormat)}</span>
        </div>
      </div>
    );
  },
);
