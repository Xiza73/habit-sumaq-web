'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import {
  CalendarDays,
  ChevronDown,
  Pencil,
  Plus,
  Trash2,
  TrendingDown,
  Wallet,
} from 'lucide-react';

import { type BudgetRecoveryPlan, type BudgetWithKpi } from '@/core/domain/entities/budget';
import { type Currency } from '@/core/domain/enums/currency.enum';

import {
  type BudgetMonthHistory,
  type BudgetSpendBreakdown,
  type DailySpend,
  getBudgetMonthHistory,
  getBudgetSpendBreakdown,
  getDailySpendHistory,
} from '@/lib/budget-kpi';
import { formatCurrency, formatPeriodLabel } from '@/lib/format';
import { cn } from '@/lib/utils';

interface BudgetKpiCardProps {
  budget: BudgetWithKpi;
  onAddMovement: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Headline card for the budget dashboard. Two layouts depending on the
 * budget's relationship to "today":
 *
 *  - **Active budget** (current month, days remaining > 0) — the
 *    "locked-day allowance" layout. Hero is `Disponible hoy` derived from
 *    the FROZEN start-of-day allowance, so logging a movement only moves
 *    that number, not the projection for the rest of the month. Optional
 *    breakdown adds the actual-vs-original-plan numbers + a 7-day bar
 *    chart of the user's recent spend.
 *
 *  - **Closed or future budget** — the simpler "remaining vs total" layout.
 *    `dailyAllowance` is either `null` (closed) or the static plan
 *    (`amount / daysInMonth`), and there's no concept of "today" inside
 *    the budget month, so the locked-day breakdown doesn't apply.
 */
export function BudgetKpiCard({ budget, onAddMovement, onEdit, onDelete }: BudgetKpiCardProps) {
  const t = useTranslations('budgets');
  const locale = useLocale();

  const period = formatPeriodLabel(
    `${budget.year}-${String(budget.month).padStart(2, '0')}`,
    locale,
  );

  const monthPrefix = `${budget.year}-${String(budget.month).padStart(2, '0')}`;
  const isCurrentMonth = budget.currentDate.startsWith(monthPrefix);
  const useLockedDayLayout = isCurrentMonth && budget.daysRemainingIncludingToday > 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <CardHeader
        period={period}
        currency={budget.currency}
        title={t('kpi.title')}
        onAddMovement={onAddMovement}
        onEdit={onEdit}
        onDelete={onDelete}
        t={t}
      />

      {useLockedDayLayout ? (
        <ActiveBudgetBody budget={budget} t={t} />
      ) : (
        <SimpleBudgetBody budget={budget} t={t} />
      )}
    </div>
  );
}

// -- Header (shared by both layouts) -------------------------------------------

interface CardHeaderProps {
  period: string;
  currency: string;
  title: string;
  onAddMovement: () => void;
  onEdit: () => void;
  onDelete: () => void;
  t: ReturnType<typeof useTranslations<'budgets'>>;
}

function CardHeader({
  period,
  currency,
  title,
  onAddMovement,
  onEdit,
  onDelete,
  t,
}: CardHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-sm text-muted-foreground">
          {period} · {currency}
        </p>
        <h2 className="mt-1 text-lg font-semibold">{title}</h2>
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
  );
}

// -- Active layout (current-month, days remaining > 0) -------------------------

interface ActiveBudgetBodyProps {
  budget: BudgetWithKpi;
  t: ReturnType<typeof useTranslations<'budgets'>>;
}

function ActiveBudgetBody({ budget, t }: ActiveBudgetBodyProps) {
  const [expanded, setExpanded] = useState(false);
  const breakdown = getBudgetSpendBreakdown(budget);
  // Defensive: these are non-null in the locked-day layout (gated by
  // `useLockedDayLayout` upstream) but TS doesn't know. Hoist guards once.
  const lockedDailyAllowance = breakdown.lockedDailyAllowance ?? 0;
  const availableToday = breakdown.availableToday ?? 0;
  const remainingAfterToday = breakdown.remainingAfterToday ?? 0;

  const isOverToday = availableToday < 0;
  // Today's progress bar — clamped at 100 even when overspent (color
  // change carries the over-today signal so we don't fight pixel math).
  const todayProgressPct =
    lockedDailyAllowance <= 0
      ? 0
      : Math.min(100, Math.max(0, (breakdown.spentToday / lockedDailyAllowance) * 100));

  return (
    <>
      {/* Headline: today's available — the "locked" number that does NOT
          shift when other days are projected. */}
      <div className="mt-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {t('kpi.availableToday')}
        </p>
        <p
          className={cn(
            'mt-1 text-4xl font-bold tabular-nums sm:text-5xl',
            isOverToday && 'text-destructive',
          )}
        >
          {formatCurrency(availableToday, budget.currency)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('kpi.spentTodayOfPlanned', {
            spent: formatCurrency(breakdown.spentToday, budget.currency),
            planned: formatCurrency(lockedDailyAllowance, budget.currency),
          })}
        </p>
      </div>

      {/* Today's progress bar. */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isOverToday ? 'bg-destructive' : 'bg-primary',
          )}
          style={{ width: `${todayProgressPct}%` }}
        />
      </div>

      {/* Future tiles — these are the "rest of the month" numbers, kept
          intentionally static through the day so the user isn't watching
          them tick down on every coffee. */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiTile
          icon={<Wallet className="size-4" />}
          label={t('kpi.restOfMonth')}
          value={formatCurrency(remainingAfterToday, budget.currency)}
          hint={t('kpi.restOfMonthHint')}
          tone={remainingAfterToday < 0 ? 'negative' : 'neutral'}
        />
        <KpiTile
          icon={<CalendarDays className="size-4" />}
          label={t('kpi.daysRemaining', { count: budget.daysRemainingIncludingToday })}
          value={t('kpi.dailyForFuture', {
            amount: formatCurrency(lockedDailyAllowance, budget.currency),
          })}
          hint={t('kpi.daysRemainingHint')}
          tone="neutral"
        />
      </div>

      {/* Deliberately NOT inside the collapsible breakdown below. It only
          renders when there is something to recover, so it appears exactly
          when it matters — and that is the moment it must not be one click
          away. Behind the collapse it would be a statistic; here it is
          guidance. */}
      <RecoveryPlanLine recovery={budget.recovery} t={t} />

      {/* Collapsible breakdown — extra info for users who want to know
          "am I trending under or over my plan this month?". */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
        aria-expanded={expanded}
      >
        {expanded ? t('kpi.collapseBreakdown') : t('kpi.expandBreakdown')}
        <ChevronDown className={cn('size-3.5 transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && <BudgetBreakdown budget={budget} breakdown={breakdown} t={t} />}
    </>
  );
}

// -- Breakdown (rendered inside ActiveBudgetBody when expanded) ----------------

interface BudgetBreakdownProps {
  budget: BudgetWithKpi;
  breakdown: BudgetSpendBreakdown;
  t: ReturnType<typeof useTranslations<'budgets'>>;
}

function BudgetBreakdown({ budget, breakdown, t }: BudgetBreakdownProps) {
  const history = getBudgetMonthHistory(budget);
  const dailyHistory = getDailySpendHistory(budget);
  const locale = useLocale();

  return (
    <div className="mt-4 space-y-6 rounded-xl border border-border bg-muted/30 p-4">
      <MonthSoFarSection budget={budget} breakdown={breakdown} history={history} t={t} />
      <DailyHistorySection
        budget={budget}
        breakdown={breakdown}
        days={dailyHistory}
        locale={locale}
        t={t}
      />
    </div>
  );
}

interface MonthSoFarSectionProps {
  budget: BudgetWithKpi;
  breakdown: BudgetSpendBreakdown;
  history: BudgetMonthHistory;
  t: ReturnType<typeof useTranslations<'budgets'>>;
}

function MonthSoFarSection({ budget, breakdown, history, t }: MonthSoFarSectionProps) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('kpi.monthSoFar')}
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <BreakdownLine
          label={t('kpi.spentSoFar')}
          value={t('kpi.spentOfTotal', {
            spent: formatCurrency(
              breakdown.spentBeforeToday + breakdown.spentToday,
              budget.currency,
            ),
            total: formatCurrency(budget.amount, budget.currency),
          })}
        />
        <BreakdownLine
          label={t('kpi.actualDailyAverage')}
          value={
            history.averageDailySpendBeforeToday === null
              ? '—'
              : formatCurrency(history.averageDailySpendBeforeToday, budget.currency)
          }
          hint={
            history.averageDailySpendBeforeToday === null
              ? t('kpi.actualDailyAverageEmpty')
              : t('kpi.actualDailyAverageHint', { days: history.daysElapsedBeforeToday })
          }
        />
        <BreakdownLine
          label={t('kpi.originalDailyTarget')}
          value={formatCurrency(history.originalDailyTarget, budget.currency)}
          hint={t('kpi.originalDailyTargetHint')}
        />
        {history.diffVsOriginal !== null && (
          <BreakdownLine
            label={t('kpi.diffVsOriginalLabel')}
            value={formatCurrency(Math.abs(history.diffVsOriginal), budget.currency)}
            hint={
              history.diffVsOriginal >= 0
                ? t('kpi.diffVsOriginalBelow')
                : t('kpi.diffVsOriginalAbove')
            }
            tone={history.diffVsOriginal >= 0 ? 'positive' : 'negative'}
          />
        )}
      </div>
    </section>
  );
}

interface RecoveryPlanLineProps {
  recovery: BudgetRecoveryPlan | null;
  t: ReturnType<typeof useTranslations<'budgets'>>;
}

/**
 * The answer to "and what do I do about it?", sitting right under the
 * over/under-plan line that raises the question.
 *
 * Silent when there is nothing to recover — a zero-day plan is noise, and the
 * section above already says the user is on or ahead of pace.
 */
function RecoveryPlanLine({ recovery, t }: RecoveryPlanLineProps) {
  // Closed month: nothing left to recover into.
  if (!recovery) return null;
  if (recovery.zeroSpendDays <= 0) return null;

  if (!recovery.recoverable) {
    // The backend still sends a count here, but it meets or exceeds the days
    // the month has left — telling the user to hold out longer than the month
    // lasts is worse than telling them it is out of reach.
    return (
      <p className="mt-4 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        {t('kpi.recoveryUnreachable')}
      </p>
    );
  }

  return (
    <p className="mt-4 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
      {t('kpi.recoveryIntro')}{' '}
      <strong className="font-medium text-foreground">
        {t('kpi.recoveryZeroSpend', { days: recovery.zeroSpendDays })}
      </strong>{' '}
      {t('kpi.recoveryOr')}{' '}
      <strong className="font-medium text-foreground">
        {t('kpi.recoveryHalfSpend', { days: recovery.halfSpendDays })}
      </strong>
      .
    </p>
  );
}

interface DailyHistorySectionProps {
  budget: BudgetWithKpi;
  breakdown: BudgetSpendBreakdown;
  days: DailySpend[];
  locale: string;
  t: ReturnType<typeof useTranslations<'budgets'>>;
}

function DailyHistorySection({ budget, breakdown, days, locale, t }: DailyHistorySectionProps) {
  if (days.length === 0) {
    return null;
  }
  // Reference line for the bars: the locked daily allowance. Bars normalize
  // against `max(allowance, biggestDay)` so the reference line stays at a
  // sensible position even when the user blew past it.
  const allowance = breakdown.lockedDailyAllowance ?? 0;
  const maxBar = Math.max(allowance, ...days.map((d) => d.spent), 1);

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('kpi.dailyHistoryTitle', { count: days.length })}
      </h3>
      <ul className="space-y-1.5">
        {days.map((day) => (
          <DailyHistoryRow
            key={day.date}
            day={day}
            allowance={allowance}
            maxBar={maxBar}
            currency={budget.currency}
            isToday={day.date === budget.currentDate}
            locale={locale}
          />
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground">
        {t('kpi.dailyHistoryReferenceHint', {
          amount: formatCurrency(allowance, budget.currency),
        })}
      </p>
    </section>
  );
}

interface DailyHistoryRowProps {
  day: DailySpend;
  allowance: number;
  maxBar: number;
  currency: Currency;
  isToday: boolean;
  locale: string;
}

function DailyHistoryRow({
  day,
  allowance,
  maxBar,
  currency,
  isToday,
  locale,
}: DailyHistoryRowProps) {
  const isOver = day.spent > allowance && allowance > 0;
  const barPct = maxBar > 0 ? (day.spent / maxBar) * 100 : 0;
  // The reference line sits at the proportional position of the allowance
  // within the same `maxBar` scale.
  const referencePct = maxBar > 0 ? (allowance / maxBar) * 100 : 0;

  // Compact "Lun 12" style label. Using `Intl` directly because the
  // weekday name is a calendar label (not a user-format date) — see the
  // exceptions documented in business-rules.md#date-display.
  const [y, m, d] = day.date.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(
    dateObj,
  );
  const dayLabel = `${capitalize(weekday)} ${d}`;

  return (
    <li className="flex items-center gap-3 text-xs">
      <span
        className={cn(
          'w-16 shrink-0 text-muted-foreground',
          isToday && 'font-semibold text-foreground',
        )}
      >
        {dayLabel}
      </span>
      <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
        {/* Reference line — only visible when there's a positive allowance
            to compare against (otherwise it'd flicker at 0). */}
        {allowance > 0 && (
          <span
            className="absolute top-0 h-full w-px bg-foreground/40"
            style={{ left: `${referencePct}%` }}
            aria-hidden
          />
        )}
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isOver ? 'bg-destructive' : 'bg-primary',
          )}
          style={{ width: `${barPct}%` }}
        />
      </div>
      <span
        className={cn(
          'w-16 shrink-0 text-right tabular-nums',
          isOver && 'text-destructive font-medium',
        )}
      >
        {formatCurrency(day.spent, currency)}
      </span>
    </li>
  );
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toLocaleUpperCase() + s.slice(1);
}

// -- Simple layout (closed or future month) ------------------------------------

interface SimpleBudgetBodyProps {
  budget: BudgetWithKpi;
  t: ReturnType<typeof useTranslations<'budgets'>>;
}

/**
 * The original `remaining` / `daily allowance` / `days remaining` /
 * `spent` layout — kept for closed-month and future-month budgets where
 * the locked-day model doesn't apply (no "today" inside the budget).
 */
function SimpleBudgetBody({ budget, t }: SimpleBudgetBodyProps) {
  const isOverspent = budget.remaining < 0;
  const progressPct = Math.min(100, Math.max(0, (budget.spent / budget.amount) * 100));

  return (
    <>
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

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isOverspent ? 'bg-destructive' : 'bg-primary',
          )}
          style={{ width: `${progressPct}%` }}
        />
      </div>

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
          label={t('kpi.daysRemaining', { count: budget.daysRemainingIncludingToday })}
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
    </>
  );
}

// -- Shared atoms --------------------------------------------------------------

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

interface BreakdownLineProps {
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'positive' | 'negative';
}

function BreakdownLine({ label, value, hint, tone = 'neutral' }: BreakdownLineProps) {
  return (
    <div className="rounded-lg border border-border/60 bg-background px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-base font-semibold tabular-nums',
          tone === 'positive' && 'text-primary',
          tone === 'negative' && 'text-destructive',
        )}
      >
        {value}
      </p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
