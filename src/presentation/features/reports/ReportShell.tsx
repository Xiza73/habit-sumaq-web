'use client';

import { type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { Loader2 } from 'lucide-react';

import { type ReportPeriod } from '@/core/domain/entities/reports';

import { PeriodSelector } from './PeriodSelector';

interface ReportShellProps {
  title: string;
  subtitle?: string;
  period: ReportPeriod;
  onPeriodChange: (period: ReportPeriod) => void;
  isLoading: boolean;
  isError: boolean;
  children: ReactNode;
}

/**
 * Shared frame for each report page: header with title + period selector,
 * loading spinner, error state, or the dashboard body. Keeps both
 * Finances and Routines pages visually consistent.
 */
export function ReportShell({
  title,
  subtitle,
  period,
  onPeriodChange,
  isLoading,
  isError,
  children,
}: ReportShellProps) {
  const t = useTranslations('reports');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <PeriodSelector value={period} onChange={onPeriodChange} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-destructive/40 py-16 text-center">
          <p className="max-w-sm text-destructive">{t('loadError')}</p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
