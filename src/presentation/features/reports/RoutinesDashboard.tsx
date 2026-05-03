'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Flame, Trophy } from 'lucide-react';

import { useRoutinesDashboard } from '@/core/application/hooks/use-reports';
import { type ReportPeriod } from '@/core/domain/entities/reports';

import { analytics } from '@/lib/analytics';
import { getStreakStyle } from '@/lib/streak-styles';
import { cn } from '@/lib/utils';

import { KpiCard } from './KpiCard';
import { ReportShell } from './ReportShell';

export function RoutinesDashboard() {
  const t = useTranslations('reports.routines');

  const [period, setPeriod] = useState<ReportPeriod>('month');
  const { data, isLoading, isError } = useRoutinesDashboard(period);

  // One event per dashboard mount — see FinancesDashboard for rationale.
  useEffect(() => {
    analytics.reportViewed('routines');
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
          {/* Today's KPIs */}
          <section>
            <SectionHeader title={t('today')} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <KpiCard
                label={t('habitsCompletion')}
                value={`${data.habitCompletionToday.completedToday}/${data.habitCompletionToday.dueToday}`}
                subtitle={t('habitsCompletionSubtitle', {
                  rate: Math.round(data.habitCompletionToday.rate * 100),
                })}
                footer={<ProgressBar value={data.habitCompletionToday.rate} color="primary" />}
              />
              <KpiCard
                label={t('quickTasksCompletion')}
                value={`${data.quickTasksToday.completed}/${data.quickTasksToday.total}`}
                subtitle={t('quickTasksPending', { count: data.quickTasksToday.pending })}
                footer={
                  <ProgressBar
                    value={
                      data.quickTasksToday.total > 0
                        ? data.quickTasksToday.completed / data.quickTasksToday.total
                        : 0
                    }
                    color="primary"
                  />
                }
              />
            </div>
          </section>

          {/* Top habit streaks */}
          <section>
            <SectionHeader title={t('topStreaks')} />
            {data.topHabitStreaks.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('topStreaksEmpty')}</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.topHabitStreaks.map((streak) => {
                  const streakStyle = getStreakStyle(streak.currentStreak);
                  return (
                    <div
                      key={streak.habitId}
                      className={cn(
                        'flex flex-col gap-3 rounded-xl border bg-card p-4',
                        streakStyle.cardClass || 'border-border',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="size-3 shrink-0 rounded-full"
                          style={{ backgroundColor: streak.color ?? 'var(--color-primary)' }}
                          aria-hidden="true"
                        />
                        <p className="truncate font-medium">{streak.name}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                          <Flame
                            className={cn('size-4', streakStyle.flameClass)}
                            aria-hidden="true"
                          />
                          <div>
                            <p className="text-xs text-muted-foreground">{t('currentStreak')}</p>
                            <p className="text-lg font-bold">{streak.currentStreak}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Trophy className="size-4 text-amber-500" aria-hidden="true" />
                          <div>
                            <p className="text-xs text-muted-foreground">{t('longestStreak')}</p>
                            <p className="text-lg font-bold">{streak.longestStreak}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t('completionRate', {
                          rate: Math.round(streak.completionRate * 100),
                        })}
                      </div>
                    </div>
                  );
                })}
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

interface ProgressBarProps {
  /** 0–1 ratio. */
  value: number;
  color?: 'primary';
}

function ProgressBar({ value, color = 'primary' }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn(
          'h-full rounded-full transition-[width]',
          color === 'primary' && 'bg-primary',
        )}
        style={{ width: `${pct}%` }}
        aria-hidden="true"
      />
    </div>
  );
}
