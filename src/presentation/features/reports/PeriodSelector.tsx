'use client';

import { useTranslations } from 'next-intl';

import { REPORT_PERIODS, type ReportPeriod } from '@/core/domain/entities/reports';

import { cn } from '@/lib/utils';

interface PeriodSelectorProps {
  value: ReportPeriod;
  onChange: (period: ReportPeriod) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const t = useTranslations('reports.periods');

  return (
    <div className="flex w-full rounded-lg border border-border p-1 sm:inline-flex sm:w-auto">
      {REPORT_PERIODS.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:flex-none',
            value === opt
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {t(opt)}
        </button>
      ))}
    </div>
  );
}
