'use client';

import { useTranslations } from 'next-intl';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { type DailyFlowPoint } from '@/core/domain/entities/reports';
import { type Currency } from '@/core/domain/enums/account.enums';

import { formatCurrency } from '@/lib/format';

interface DailyFlowChartProps {
  currency: Currency;
  points: DailyFlowPoint[];
}

/**
 * Line chart showing daily income and expense over the selected period.
 * Income and expense each get their own line — no stacking, so the user
 * reads them independently. Short-date labels on the X axis to avoid
 * crowding on narrow viewports.
 */
export function DailyFlowChart({ currency, points }: DailyFlowChartProps) {
  const t = useTranslations('reports.finances.dailyFlow');

  if (points.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t('empty')}</p>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.4} />
          <XAxis
            dataKey="date"
            tickFormatter={formatShortDate}
            stroke="var(--color-muted-foreground)"
            fontSize={11}
          />
          <YAxis
            stroke="var(--color-muted-foreground)"
            fontSize={11}
            tickFormatter={(v: number) => formatCompactCurrency(v, currency)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-popover)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value) => formatCurrency(Number(value), currency)}
            labelFormatter={(label) => formatShortDate(String(label))}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} iconType="circle" />
          <Line
            type="monotone"
            dataKey="income"
            name={t('income')}
            stroke="var(--color-chart-income, #10b981)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="expense"
            name={t('expense')}
            stroke="var(--color-chart-expense, #ef4444)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Returns "DD/MM" for the UTC date (ISO string). */
function formatShortDate(isoDate: string): string {
  const [, m, d] = isoDate.split('-');
  return `${d}/${m}`;
}

/** Compact currency formatting for axis ticks — skips decimals to save space. */
function formatCompactCurrency(value: number, currency: Currency): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}
