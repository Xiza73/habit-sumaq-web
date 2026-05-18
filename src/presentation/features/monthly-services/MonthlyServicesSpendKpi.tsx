'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { type MonthlyService } from '@/core/domain/entities/monthly-service';

import { formatCurrency } from '@/lib/format';
import {
  buildMonthlyServicesKpis,
  getKpiProgress,
  type MonthlyServicesCurrencyKpi,
} from '@/lib/monthly-services-kpi';
import { cn } from '@/lib/utils';

interface MonthlyServicesSpendKpiProps {
  services: MonthlyService[];
  /** Current calendar month in the user's timezone (`YYYY-MM`). */
  currentPeriod: string;
}

/**
 * Per-currency "Pagado / Estimado" KPI for the services dashboard.
 *
 * Renders one card per currency the user has services in for the current
 * month — summing across currencies would be nonsense (no FX). When the
 * user has nothing in scope (no active services due/paid this month) the
 * whole component returns `null` so the page doesn't show an empty shell.
 *
 * Computation logic lives in `src/lib/monthly-services-kpi.ts` so the
 * scoping rules (overdue out, archived out, only `nextDuePeriod === current`
 * or `isPaidForCurrentMonth=true`) are unit-tested independently of any
 * rendering.
 */
export function MonthlyServicesSpendKpi({ services, currentPeriod }: MonthlyServicesSpendKpiProps) {
  const t = useTranslations('monthlyServices.spendKpi');

  // Memo because `services` changes reference on every parent re-render (it's
  // the query data) but the KPI itself is deterministic in `(services, period)`.
  // Cheap, but lets us skip the bucketing pass for free-on-paint events.
  const kpis = useMemo(
    () => buildMonthlyServicesKpis(services, currentPeriod),
    [services, currentPeriod],
  );

  if (kpis.length === 0) return null;

  return (
    <section
      aria-label="services-spend-kpi"
      className="rounded-xl border border-border bg-card p-4"
    >
      <h3 className="mb-3 text-sm font-medium text-muted-foreground">{t('title')}</h3>
      <div
        className={cn(
          'grid gap-3',
          // 1 currency → single column. 2+ → 2-col layout on sm+, the grid
          // wraps cleanly with auto-fit so a third currency just stacks below.
          kpis.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2',
        )}
      >
        {kpis.map((kpi) => (
          <CurrencyKpiCard key={kpi.currency} kpi={kpi} />
        ))}
      </div>
    </section>
  );
}

function CurrencyKpiCard({ kpi }: { kpi: MonthlyServicesCurrencyKpi }) {
  const t = useTranslations('monthlyServices.spendKpi');
  const progress = getKpiProgress(kpi);
  // The bar is only meaningful when there's something to compare against.
  // No estimate → render the "Pagado" number on its own.
  const showProgressBar = kpi.estimated > 0;

  return (
    <div className="rounded-lg border border-border/60 bg-background p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {kpi.currency}
        </span>
        <span className="text-xs text-muted-foreground">{t('paidLabel')}</span>
      </div>

      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-2xl font-semibold tabular-nums">
          {formatCurrency(kpi.paid, kpi.currency)}
        </p>
        {showProgressBar && (
          <p className="text-xs text-muted-foreground">
            {t('ofEstimated', { estimated: formatCurrency(kpi.estimated, kpi.currency) })}
          </p>
        )}
      </div>

      {showProgressBar && (
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}

      {kpi.servicesWithoutEstimate > 0 && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {t('missingEstimate', { count: kpi.servicesWithoutEstimate })}
        </p>
      )}
    </div>
  );
}
