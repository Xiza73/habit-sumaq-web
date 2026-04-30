'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

import { ChevronRight, History } from 'lucide-react';

import { type Budget } from '@/core/domain/entities/budget';

import { formatCurrency, formatPeriodLabel } from '@/lib/format';

interface BudgetHistoryListProps {
  /** Already filtered / pre-sorted by the caller — most recent period first. */
  budgets: Budget[];
}

/**
 * History list under the dashboard. Each row links to `/budgets/[id]` for
 * the detail view (read-only KPI + movements snapshot of the closed month).
 * Skips budgets for the active month — those are already shown in the
 * dashboard above. Caller passes the already-filtered list.
 */
export function BudgetHistoryList({ budgets }: BudgetHistoryListProps) {
  const t = useTranslations('budgets');
  const locale = useLocale();

  if (budgets.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <History className="size-4" />
        {t('history.title')}
      </div>
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {budgets.map((b) => (
          <li key={b.id}>
            <Link
              href={`/budgets/${b.id}`}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {formatPeriodLabel(`${b.year}-${String(b.month).padStart(2, '0')}`, locale)} ·{' '}
                  {b.currency}
                </p>
              </div>
              <p className="shrink-0 text-sm tabular-nums text-muted-foreground">
                {formatCurrency(b.amount, b.currency)}
              </p>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
