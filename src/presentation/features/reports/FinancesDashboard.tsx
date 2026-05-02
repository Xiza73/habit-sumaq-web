'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { useFinancesDashboard } from '@/core/application/hooks/use-reports';
import { type ReportPeriod } from '@/core/domain/entities/reports';

import { analytics } from '@/lib/analytics';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

import { BarList } from './BarList';
import { DailyFlowChart } from './DailyFlowChart';
import { KpiCard } from './KpiCard';
import { ReportShell } from './ReportShell';

export function FinancesDashboard() {
  const t = useTranslations('reports.finances');

  const [period, setPeriod] = useState<ReportPeriod>('month');
  const { data, isLoading, isError } = useFinancesDashboard(period);

  // Track each render of this dashboard once on mount. Period changes don't
  // re-fire — the event answers "did the user open Finances", not "how often
  // did they flip the period selector".
  useEffect(() => {
    analytics.reportViewed('finances');
  }, []);

  return (
    <ReportShell
      title={t('title')}
      subtitle={t('subtitle')}
      period={period}
      onPeriodChange={setPeriod}
      isLoading={isLoading}
      isError={isError}
    >
      {data && (
        <div className="space-y-8">
          {/* Balance by currency — one KPI per currency bucket */}
          <section>
            <SectionHeader title={t('totalBalance')} />
            {data.totalBalance.length === 0 ? (
              <EmptyState message={t('totalBalanceEmpty')} />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                {data.totalBalance.map((bal) => (
                  <KpiCard
                    key={bal.currency}
                    label={bal.currency}
                    value={formatCurrency(bal.amount, bal.currency)}
                    subtitle={t('accountCount', { count: bal.accountCount })}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Period flow — income, expense, net */}
          <section>
            <SectionHeader title={t('periodFlow')} />
            {data.periodFlow.length === 0 ? (
              <EmptyState message={t('periodFlowEmpty')} />
            ) : (
              <div className="space-y-4">
                {data.periodFlow.map((flow) => (
                  <div key={flow.currency} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <KpiCard
                      label={t('income')}
                      value={formatCurrency(flow.income, flow.currency)}
                      valueClassName="text-emerald-500"
                      subtitle={flow.currency}
                    />
                    <KpiCard
                      label={t('expense')}
                      value={formatCurrency(flow.expense, flow.currency)}
                      valueClassName="text-rose-500"
                      subtitle={flow.currency}
                    />
                    <KpiCard
                      label={t('net')}
                      value={formatCurrency(flow.net, flow.currency)}
                      valueClassName={cn(
                        flow.net > 0 && 'text-emerald-500',
                        flow.net < 0 && 'text-rose-500',
                      )}
                      subtitle={flow.currency}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Top categories + Debts side by side on desktop */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section>
              <SectionHeader title={t('topExpenseCategories')} />
              {data.topExpenseCategories.length === 0 ? (
                <EmptyState message={t('topCategoriesEmpty')} />
              ) : (
                <BarList
                  items={data.topExpenseCategories.map((cat) => ({
                    label: cat.name ?? t('uncategorized'),
                    value: formatCurrency(cat.total, cat.currency),
                    percentage: cat.percentage,
                    color: cat.color,
                  }))}
                  // Defensive — the parent guard means BarList never renders
                  // the empty state here, but the prop is required.
                  emptyMessage={t('topCategoriesEmpty')}
                />
              )}
            </section>

            <section>
              <SectionHeader title={t('pendingDebts')} />
              {data.pendingDebts.length === 0 ? (
                <EmptyState message={t('pendingDebtsEmpty')} />
              ) : (
                <div className="space-y-3">
                  {data.pendingDebts.map((d) => (
                    <div key={d.currency} className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-muted-foreground">{t('owesYou')}</span>
                        <span className="font-medium text-emerald-500">
                          {formatCurrency(d.owesYou, d.currency)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-sm text-muted-foreground">{t('youOwe')}</span>
                        <span className="font-medium text-rose-500">
                          {formatCurrency(d.youOwe, d.currency)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3 border-t border-border pt-2">
                        <span className="text-sm font-medium">
                          {t('net')} ({d.currency})
                        </span>
                        <span
                          className={cn(
                            'font-bold',
                            d.net > 0 && 'text-emerald-500',
                            d.net < 0 && 'text-rose-500',
                          )}
                        >
                          {formatCurrency(d.net, d.currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Daily flow — one chart per currency */}
          <section>
            <SectionHeader title={t('dailyFlow.title')} />
            {data.dailyFlow.length === 0 ? (
              <EmptyState message={t('dailyFlow.empty')} />
            ) : (
              <div className="space-y-6">
                {data.dailyFlow.map((series) => (
                  <div
                    key={series.currency}
                    className="rounded-xl border border-border bg-card p-4"
                  >
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {series.currency}
                    </p>
                    <DailyFlowChart currency={series.currency} points={series.points} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </ReportShell>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
      {title}
    </h2>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-muted-foreground">{message}</p>;
}
