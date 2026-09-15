'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import {
  Archive,
  ArchiveRestore,
  Check,
  Flame,
  Minus,
  MoreVertical,
  Pencil,
  Plus,
  Shield,
  Target,
  Trash2,
} from 'lucide-react';

import { type HabitWithStats } from '@/core/domain/entities/habit';

import { getHabitProgress } from '@/lib/habit-progress';
import { getStreakStyle } from '@/lib/streak-styles';
import { cn } from '@/lib/utils';

import { DayTargetStepper } from './DayTargetStepper';

interface HabitCardProps {
  habit: HabitWithStats;
  onCheckIn: (habit: HabitWithStats) => void;
  onUndo: (habit: HabitWithStats) => void;
  onEdit: (habit: HabitWithStats) => void;
  onArchive: (habit: HabitWithStats) => void;
  onDelete: (habit: HabitWithStats) => void;
  /**
   * Sets the target for the day being shown. Omitted, the denominator renders
   * as plain text — the list passes it, read-only surfaces do not.
   */
  onTargetChange?: (habit: HabitWithStats, targetCount: number) => void;
  targetPending?: boolean;
  /**
   * Spends a streak shield on `habit.rescuableDate`. Omitted on read-only
   * surfaces — the row then simply does not offer the action.
   */
  onRescueStreak?: (habit: HabitWithStats) => void;
  /**
   * Shields the user holds. Drives whether the rescue row is actionable or
   * only informative — see the row itself for why it shows at zero.
   */
  streakShields?: number;
  rescuePending?: boolean;
  /**
   * Drops the rescue covering the period in view and takes the shield back.
   * Omitted on read-only surfaces, where the shield then reads as a plain
   * marker with no action.
   */
  onReleaseRescue?: (habit: HabitWithStats) => void;
  releasePending?: boolean;
}

export function HabitCard({
  habit,
  onCheckIn,
  onUndo,
  onEdit,
  onArchive,
  onDelete,
  onTargetChange,
  onRescueStreak,
  streakShields = 0,
  rescuePending = false,
  targetPending = false,
  onReleaseRescue,
  releasePending = false,
}: HabitCardProps) {
  const t = useTranslations('habits');
  const tCommon = useTranslations('common');
  const [menuOpen, setMenuOpen] = useState(false);

  const { todayCount, periodCount, isCompleted, progress } = getHabitProgress(habit);
  const streakStyle = getStreakStyle(habit.currentStreak);

  return (
    <div
      className={cn(
        'group relative rounded-xl border bg-card p-5 transition-shadow hover:shadow-md',
        streakStyle.cardClass || 'border-border',
      )}
    >
      <div className="absolute right-3 top-3">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
          aria-label="Habit actions"
        >
          <MoreVertical className="size-4" />
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setMenuOpen(false);
              }}
              role="button"
              tabIndex={0}
              aria-label="Close menu"
            />
            <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-border bg-popover py-1 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(habit);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
              >
                <Pencil className="size-4" />
                {t('editHabit')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onArchive(habit);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
              >
                {habit.isArchived ? (
                  <>
                    <ArchiveRestore className="size-4" />
                    {tCommon('unarchive')}
                  </>
                ) : (
                  <>
                    <Archive className="size-4" />
                    {tCommon('archive')}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(habit);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted"
              >
                <Trash2 className="size-4" />
                {t('deleteHabit')}
              </button>
            </div>
          </>
        )}
      </div>

      <Link href={`/habits/${habit.id}`} className="block">
        <div className="flex items-center gap-3">
          <div
            className="flex size-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: habit.color ? `${habit.color}20` : undefined }}
          >
            <Target className="size-5" style={{ color: habit.color ?? undefined }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{habit.name}</p>
            <p className="text-xs text-muted-foreground">{t(`frequencies.${habit.frequency}`)}</p>
          </div>
        </div>
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Flame className={cn('size-3.5', streakStyle.flameClass)} />
            <span className="tabular-nums">{habit.currentStreak}</span>
          </div>
          <span
            data-testid="habit-progress"
            className="flex items-center text-xs tabular-nums text-muted-foreground"
          >
            {periodCount}/
            <DayTargetStepper
              value={habit.periodTarget}
              onChange={(next) => onTargetChange?.(habit, next)}
              // WEEKLY targets belong to the week, not to a day, so they are
              // only editable through the habit form.
              editable={!!onTargetChange && !habit.isArchived && habit.frequency === 'DAILY'}
              pending={targetPending}
            />
          </span>
        </div>

        {!habit.isArchived && (
          <div className="flex items-center gap-1.5">
            {todayCount > 0 && (
              <button
                type="button"
                onClick={() => onUndo(habit)}
                className="flex size-7 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                aria-label={t('undoCheckIn')}
              >
                <Minus className="size-3" />
              </button>
            )}
            {/*
              A rescued period does NOT get a plain check-in button. Logging
              over a shield spends it on a period that no longer needs it, and
              before this the UI gave no sign the day was protected at all.

              Deliberately not a `disabled` button: a disabled control cannot
              be clicked, so it cannot explain itself. The shield says what the
              state is AND offers the way out — release it, take the shield
              back, then log the day like any other.
            */}
            {habit.periodRescued ? (
              <button
                type="button"
                onClick={() => onReleaseRescue?.(habit)}
                disabled={!onReleaseRescue || releasePending}
                className={cn(
                  'flex size-9 items-center justify-center rounded-full border transition-colors',
                  onReleaseRescue
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400'
                    : 'cursor-default border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
                )}
                aria-label={t('releaseRescue.action')}
                title={t('releaseRescue.action')}
              >
                <Shield className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onCheckIn(habit)}
                disabled={isCompleted}
                className={cn(
                  'flex size-9 items-center justify-center rounded-full transition-colors',
                  isCompleted
                    ? 'bg-income/20 text-income'
                    : 'border border-border text-muted-foreground hover:border-primary hover:text-primary',
                )}
                aria-label={t('checkIn')}
              >
                {isCompleted ? <Check className="size-4" /> : <Plus className="size-4" />}
              </button>
            )}
          </div>
        )}
      </div>

      {/*
        The fill stays empty on a rescued period — nothing WAS done, and the
        completion rate says so. What changes is the track: amber instead of
        the neutral muted, so an empty bar reads as "protected" rather than
        "you missed this". That ambiguity is what made a user log over their
        own shield.
      */}
      <div
        className={cn(
          'mt-3 h-1.5 overflow-hidden rounded-full',
          habit.periodRescued ? 'bg-amber-500/25' : 'bg-muted',
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            isCompleted ? 'bg-income' : 'bg-primary',
          )}
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/*
        Shown whenever a period is rescuable — even at zero shields, where it
        renders disabled. This is the one moment the mechanic is teachable: a
        streak is actually at risk right now. Hiding it until the user happens
        to hold a shield AND have a gap means most people never learn the
        feature exists. It is deliberately NOT shown when there is nothing to
        rescue, which is what keeps it from reading as a nag.
      */}
      {!habit.isArchived && habit.rescuableDate && onRescueStreak && (
        <button
          type="button"
          onClick={() => onRescueStreak(habit)}
          disabled={streakShields === 0 || rescuePending}
          className={cn(
            'mt-3 flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
            streakShields > 0
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400'
              : 'cursor-not-allowed border-border text-muted-foreground',
          )}
        >
          <Shield className="size-3.5 shrink-0" />
          {streakShields > 0
            ? t('rescueStreak.action', { count: streakShields })
            : t('rescueStreak.noShields')}
        </button>
      )}

      {habit.isArchived && (
        <div className="mt-3 rounded-md bg-muted px-2 py-1 text-center text-xs text-muted-foreground">
          {tCommon('archive')}
        </div>
      )}
    </div>
  );
}
