'use client';

import { useLocale, useTranslations } from 'next-intl';

import { PiggyBank, Plus } from 'lucide-react';

import { type Currency } from '@/core/domain/enums/account.enums';

import { formatPeriodLabel } from '@/lib/format';

interface EmptyBudgetCtaProps {
  currency: Currency;
  /** YYYY and MM the dashboard is currently displaying. */
  year: number;
  month: number;
  onCreate: () => void;
}

/**
 * Renders when `GET /budgets/current` returned `null` — no budget exists for
 * the (currency, year, month) the user is looking at. Big illustration + a
 * primary CTA so it's obvious what to do next.
 */
export function EmptyBudgetCta({ currency, year, month, onCreate }: EmptyBudgetCtaProps) {
  const t = useTranslations('budgets');
  const locale = useLocale();

  const period = formatPeriodLabel(`${year}-${String(month).padStart(2, '0')}`, locale);

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <PiggyBank className="size-8" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">{t('empty.title', { period, currency })}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{t('empty.subtitle')}</p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Plus className="size-4" />
        {t('empty.createBudget')}
      </button>
    </div>
  );
}
