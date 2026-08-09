'use client';

import { forwardRef } from 'react';
import { useTranslations } from 'next-intl';

import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

import { useDateFormat } from '@/core/application/hooks/use-user-settings';
import { type DebtLoan, type DebtLoanSummaryRow } from '@/core/domain/entities/debt-loan';

import { formatCurrency, formatDate, getTodayLocaleDate } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Solid background painted into the exported PNG, per theme. Kept in sync with
 * the card's own `bg-white` / `dark:bg-zinc-900` so the file matches what the
 * user sees on screen.
 *
 * This is the one colour JS has to choose. Every other colour on the card is a
 * Tailwind `dark:` variant, which resolves on the live node and therefore
 * survives rasterization — but `backgroundColor` is painted BEHIND the node by
 * `html-to-image` rather than read off it, so leaving it white would frame a
 * dark card in a white halo.
 */
export const SHARE_IMAGE_BACKGROUNDS = {
  light: '#ffffff',
  dark: '#18181b', // zinc-900, matching `dark:bg-zinc-900` below
} as const;

/**
 * Pick the export background for a resolved next-themes value. `undefined`
 * (next-themes has not read the stored preference yet) falls back to light —
 * a wrong-but-solid background beats a transparent or black one.
 */
export function shareImageBackground(resolvedTheme: string | undefined): string {
  return resolvedTheme === 'dark' ? SHARE_IMAGE_BACKGROUNDS.dark : SHARE_IMAGE_BACKGROUNDS.light;
}

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
 * Follows the viewer's theme: every colour has a `dark:` counterpart, so a
 * screenshot taken in dark mode is dark. The variants resolve on the live node
 * — it is mounted in the real DOM under the theme class — and `html-to-image`
 * copies computed styles, so they survive rasterization without any JS. The
 * one exception is the solid backdrop, see {@link shareImageBackground}.
 *
 * Colours stay on the concrete `zinc` / `red` / `green` scales rather than the
 * app's CSS-variable tokens, because those are `oklch()` and `html-to-image`
 * does not reliably resolve custom properties during the clone.
 *
 * Rendered off-screen (never `display:none`) so `html-to-image` can lay it
 * out; the wrapper handles the off-screen positioning while this node provides
 * the fixed width, padding and solid background captured in the PNG.
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
        className="flex w-[360px] flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-lg font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {row.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {row.displayName}
            </span>
            <span className="mt-0.5 inline-flex w-fit rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {row.currency}
            </span>
          </div>
        </div>

        {visibleRows.length === 0 ? (
          <p className="text-xs italic text-zinc-400 dark:text-zinc-500">{t('allSettled')}</p>
        ) : (
          <ul className="space-y-2">
            {visibleRows.map((item) => {
              const isDebt = item.type === 'DEBT';
              return (
                <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    {isDebt ? (
                      <ArrowUpRight
                        className="size-3.5 shrink-0 text-red-600 dark:text-red-400"
                        aria-hidden
                      />
                    ) : (
                      <ArrowDownLeft
                        className="size-3.5 shrink-0 text-green-600 dark:text-green-400"
                        aria-hidden
                      />
                    )}
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-zinc-700 dark:text-zinc-300">
                        {item.description || row.displayName}
                      </span>
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        {formatDate(item.date, dateFormat)}
                      </span>
                    </span>
                  </span>
                  <span
                    className={cn(
                      'shrink-0 font-medium',
                      isDebt
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-600 dark:text-green-400',
                    )}
                  >
                    {formatCurrency(item.remainingAmount, item.currency)}
                  </span>
                </li>
              );
            })}
            {hiddenCount > 0 && (
              <li className="text-xs italic text-zinc-400 dark:text-zinc-500">
                {t('andMore', { count: hiddenCount })}
              </li>
            )}
          </ul>
        )}

        <div className="flex items-center justify-between border-t border-zinc-200 pt-3 text-sm dark:border-zinc-800">
          <span className="font-medium text-zinc-500 dark:text-zinc-400">{t('total')}</span>
          {netIsZero ? (
            <span className="text-zinc-400 dark:text-zinc-500">{t('allSettled')}</span>
          ) : (
            <span
              className={cn(
                'font-semibold',
                netInYourFavor
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400',
              )}
            >
              {netInYourFavor ? t('theyOweYou') : t('youOwe')}{' '}
              {formatCurrency(netAmount, row.currency)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-zinc-100 pt-3 text-xs text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
          <span className="font-medium text-zinc-500 dark:text-zinc-400">Habit Sumaq</span>
          <span>{formatDate(getTodayLocaleDate(), dateFormat)}</span>
        </div>
      </div>
    );
  },
);
