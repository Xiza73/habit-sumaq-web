'use client';

import { useLocale, useTranslations } from 'next-intl';

import { CalendarDays, Pencil, Plus, Trash2, TrendingDown, Wallet } from 'lucide-react';

import { type BudgetWithKpi } from '@/core/domain/entities/budget';

import { formatCurrency, formatPeriodLabel } from '@/lib/format';
import { cn } from '@/lib/utils';

interface BudgetKpiCardProps {
  budget: BudgetWithKpi;
  onAddMovement: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Headline card for the budget dashboard. Lays out the KPI numbers in the
 * order users actually scan: remaining (big) → daily allowance → spent vs
 * total → days left. The card also hosts the three primary actions
 * (add movement, edit amount, delete budget).
 */
export function BudgetKpiCard({ budget, onAddMovement, onEdit, onDelete }: BudgetKpiCardProps) {
  const t = useTranslations('budgets');
  const locale = useLocale();

  const period = formatPeriodLabel(
    `${budget.year}-${String(budget.month).padStart(2, '0')}`,
    locale,
  );
  // Negative remaining = overspend. Used to switch color to destructive.
  const isOverspent = budget.remaining < 0;
  const progressPct = Math.min(100, Math.max(0, (budget.spent / budget.amount) * 100));

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {period} · {budget.currency}
          </p>
          <h2 className="mt-1 text-lg font-semibold">{t('kpi.title')}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onAddMovement}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="size-4" />
            {t('kpi.addMovement')}
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            aria-label={t('kpi.editAmount')}
          >
            <Pencil className="size-3.5" />
            <span className="hidden sm:inline">{t('kpi.editAmount')}</span>
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            aria-label={t('kpi.delete')}
          >
            <Trash2 className="size-3.5" />
            <span className="hidden sm:inline">{t('kpi.delete')}</span>
          </button>
        </div>
      </div>

      {/* Headline: remaining */}
      <div className="mt-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {t('kpi.remaining')}
        </p>
        <p
          className={cn(
            'mt-1 text-4xl font-bold tabular-nums sm:text-5xl',
            isOverspent && 'text-destructive',
          )}
        >
          {formatCurrency(budget.remaining, budget.currency)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('kpi.spentOfTotal', {
            spent: formatCurrency(budget.spent, budget.currency),
            total: formatCurrency(budget.amount, budget.currency),
          })}
        </p>
      </div>

      {/* Progress bar — clamps at 100 even when overspent (color change carries
          the overspend signal so we don't fight pixel math). */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isOverspent ? 'bg-destructive' : 'bg-primary',
          )}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* KPI tiles */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiTile
          icon={<TrendingDown className="size-4" />}
          label={t('kpi.dailyAllowance')}
          value={
            budget.dailyAllowance === null
              ? '—'
              : formatCurrency(budget.dailyAllowance, budget.currency)
          }
          hint={
            budget.dailyAllowance === null
              ? t('kpi.dailyAllowanceClosedHint')
              : t('kpi.dailyAllowanceHint')
          }
          tone={
            budget.dailyAllowance !== null && budget.dailyAllowance < 0 ? 'negative' : 'neutral'
          }
        />
        <KpiTile
          icon={<CalendarDays className="size-4" />}
          label={t('kpi.daysRemaining')}
          value={String(budget.daysRemainingIncludingToday)}
          hint={t('kpi.daysRemainingHint')}
          tone="neutral"
        />
        <KpiTile
          icon={<Wallet className="size-4" />}
          label={t('kpi.spent')}
          value={formatCurrency(budget.spent, budget.currency)}
          hint={t('kpi.spentHint')}
          tone="neutral"
        />
      </div>
    </div>
  );
}

interface KpiTileProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone: 'neutral' | 'negative';
}

function KpiTile({ icon, label, value, hint, tone }: KpiTileProps) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p
        className={cn(
          'mt-1 text-xl font-semibold tabular-nums',
          tone === 'negative' && 'text-destructive',
        )}
      >
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}
