'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

import { type MonthlyService } from '@/core/domain/entities/monthly-service';

import { formatPeriodLabel } from '@/lib/format';
import { cn } from '@/lib/utils';

interface MonthlyServicesSummaryProps {
  services: MonthlyService[];
}

function getCurrentMonthLabel(locale: string): string {
  const now = new Date();
  // Shares the period formatter with the cards so every surface reads the
  // same way (e.g. "Abril 2026"). Timezone of the flags themselves is handled
  // by the backend based on the x-timezone header.
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return formatPeriodLabel(currentPeriod, locale);
}

export function MonthlyServicesSummary({ services }: MonthlyServicesSummaryProps) {
  const t = useTranslations('monthlyServices.summary');
  const locale = useLocale();

  const { paid, pending, overdue } = useMemo(() => {
    const active = services.filter((s) => s.isActive);
    return {
      paid: active.filter((s) => s.isPaidForCurrentMonth).length,
      overdue: active.filter((s) => s.isOverdue).length,
      pending: active.filter((s) => !s.isPaidForCurrentMonth && !s.isOverdue).length,
    };
  }, [services]);

  const monthLabel = getCurrentMonthLabel(locale);
  const hasOverdue = overdue > 0;

  return (
    <section
      aria-label="services-summary"
      className={cn(
        'flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between',
        hasOverdue ? 'border-destructive/40' : 'border-border',
      )}
    >
      <p className="text-sm font-medium text-foreground">
        {/* No Tailwind `capitalize` here — the helper already title-cases the
            month correctly. `capitalize` would uppercase connectors like the
            "de" in pt-BR ("Abril De 2026") — a bug we hit during review. */}
        {t('currentMonth', { month: monthLabel })}
      </p>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-income/15 px-2.5 py-1 font-medium text-income">
          <CheckCircle2 className="size-3.5" />
          {t('paid', { count: paid })}
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 font-medium text-amber-700 dark:text-amber-400">
          <Clock className="size-3.5" />
          {t('pending', { count: pending })}
        </span>

        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium',
            hasOverdue
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-muted text-muted-foreground',
          )}
        >
          <AlertTriangle className="size-3.5" />
          {t('overdue', { count: overdue })}
        </span>
      </div>
    </section>
  );
}
