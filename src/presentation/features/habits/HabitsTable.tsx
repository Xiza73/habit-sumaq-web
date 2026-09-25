'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import {
  Archive,
  ArchiveRestore,
  Check,
  Eye,
  Minus,
  Pencil,
  PictureInPicture2,
  Plus,
  Shield,
  Target,
  Trash2,
} from 'lucide-react';

import { type HabitWithStats } from '@/core/domain/entities/habit';

import { DataTable, type DataTableColumn } from '@/presentation/components/ui/DataTable';

import { getHabitProgress } from '@/lib/habit-progress';
import { cn } from '@/lib/utils';

import { DayTargetStepper } from './DayTargetStepper';

interface HabitsTableProps {
  habits: HabitWithStats[];
  /** Log one check-in for the habit (same handler the cards use). */
  onCheckIn: (habit: HabitWithStats) => void;
  /** Remove one check-in for the habit (same handler the cards use). */
  onUndo: (habit: HabitWithStats) => void;
  /** Open the edit form for the habit (same handler the cards use). */
  onEdit: (habit: HabitWithStats) => void;
  /** Archive / unarchive the habit (same handler the cards use). */
  onArchive: (habit: HabitWithStats) => void;
  /** Delete the habit (same handler the cards use). */
  onDelete: (habit: HabitWithStats) => void;
  /** Sets the target for the day being shown. See `HabitCard`. */
  onTargetChange?: (habit: HabitWithStats, targetCount: number) => void;
  targetPending?: boolean;
  /** Spends a streak shield on `habit.rescuableDate`. See `HabitCard`. */
  onRescueStreak?: (habit: HabitWithStats) => void;
  streakShields?: number;
  rescuePending?: boolean;
  /** Drops the rescue covering the period in view. See `HabitCard`. */
  onReleaseRescue?: (habit: HabitWithStats) => void;
  releasePending?: boolean;
  /** Opens the habit in a floating window. Desktop only — see `HabitCard`. */
  onOpenPip?: (habit: HabitWithStats) => void;
}

const ICON_BUTTON_CLASS =
  'inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

/**
 * Table view of the habits list. Built on the shared `DataTable` primitive and
 * wired to the EXACT handlers the cards use (`onCheckIn`, `onUndo`, `onEdit`,
 * `onArchive`, `onDelete`), so the table exposes the SAME per-habit actions the
 * card does — including opening the habit detail (the whole card is a link) via
 * an explicit "view" action, the conditional undo (shown only when today's
 * count > 0, matching the card's minus button), and the streak rescue (shown
 * only when the habit has a rescuable period, matching the card's row).
 *
 * The focus-timer is intentionally left out of the table: it is a list-level
 * action (a single header button in `HabitList`, not a per-habit control), so
 * it stays in the header regardless of the active view mode.
 */
export function HabitsTable({
  habits,
  onCheckIn,
  onUndo,
  onEdit,
  onArchive,
  onDelete,
  onTargetChange,
  targetPending = false,
  onRescueStreak,
  streakShields = 0,
  rescuePending = false,
  onReleaseRescue,
  releasePending = false,
  onOpenPip,
}: HabitsTableProps) {
  const t = useTranslations('habits');
  const tPip = useTranslations('pip');
  const tCommon = useTranslations('common');

  const columns: DataTableColumn<HabitWithStats>[] = [
    {
      key: 'name',
      // The habit's colour is the only thing that tells two rows apart at a
      // glance, and the card view already leans on it (`HabitCard` tints the
      // same icon). Dropping it in the table made the list read as
      // undifferentiated text. Mirrors `CategoriesTable`'s name cell — the
      // other module whose entity carries a user-picked colour — so both
      // tables surface colour the same way.
      header: t('table.name'),
      render: (habit) => (
        <div className="flex items-center gap-2">
          <span
            data-testid="habit-color"
            className="flex size-7 shrink-0 items-center justify-center rounded-md"
            style={{ backgroundColor: habit.color ? `${habit.color}20` : undefined }}
          >
            <Target className="size-4" style={{ color: habit.color ?? undefined }} />
          </span>
          <span className="font-medium">{habit.name}</span>
        </div>
      ),
    },
    {
      key: 'frequency',
      header: t('table.frequency'),
      render: (habit) => (
        <span className="text-muted-foreground">{t(`frequencies.${habit.frequency}`)}</span>
      ),
    },
    {
      key: 'target',
      header: t('table.target'),
      align: 'right',
      render: (habit) => <span className="tabular-nums">{habit.targetCount}</span>,
    },
    {
      key: 'todayProgress',
      header: t('table.todayProgress'),
      render: (habit) => {
        const { periodCount, isCompleted, progress } = getHabitProgress(habit);
        return (
          <div className="flex items-center gap-2">
            <span
              data-testid="habit-progress"
              className="flex shrink-0 items-center tabular-nums text-muted-foreground"
            >
              {periodCount}/
              <DayTargetStepper
                value={habit.periodTarget}
                onChange={(next) => onTargetChange?.(habit, next)}
                // WEEKLY targets belong to the week, not to a day.
                editable={!!onTargetChange && !habit.isArchived && habit.frequency === 'DAILY'}
                pending={targetPending}
              />
            </span>
            <div
              className={cn(
                'h-1.5 w-24 overflow-hidden rounded-full',
                habit.periodRescued ? 'bg-amber-500/25' : 'bg-muted',
              )}
            >
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  isCompleted ? 'bg-income' : 'bg-primary',
                )}
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: t('table.actions'),
      align: 'right',
      render: (habit) => {
        const { todayCount, isCompleted } = getHabitProgress(habit);
        return (
          <div className="flex items-center justify-end gap-1">
            {/* Same action the card offers, in the same place in the row. The
                two views must not disagree about what you can do to a habit. */}
            {onOpenPip && (
              <button
                type="button"
                onClick={() => onOpenPip(habit)}
                aria-label={tPip('open')}
                title={tPip('open')}
                className={ICON_BUTTON_CLASS}
              >
                <PictureInPicture2 className="size-3.5" aria-hidden />
              </button>
            )}
            <Link
              href={`/habits/${habit.id}`}
              aria-label={t('viewDetail')}
              title={t('viewDetail')}
              className={ICON_BUTTON_CLASS}
            >
              <Eye className="size-3.5" aria-hidden />
            </Link>
            {/*
              Same rule as the card: offered whenever a period is rescuable,
              disabled rather than hidden at zero shields so the mechanic is
              discoverable exactly when a streak is at risk. The table's whole
              contract is exposing the SAME per-habit actions the card does.
            */}
            {!habit.isArchived && habit.rescuableDate && onRescueStreak && (
              <button
                type="button"
                onClick={() => onRescueStreak(habit)}
                disabled={streakShields === 0 || rescuePending}
                aria-label={
                  streakShields > 0
                    ? t('rescueStreak.action', { count: streakShields })
                    : t('rescueStreak.noShields')
                }
                title={
                  streakShields > 0
                    ? t('rescueStreak.action', { count: streakShields })
                    : t('rescueStreak.noShields')
                }
                className={cn(
                  'inline-flex size-7 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  streakShields > 0
                    ? 'text-amber-600 hover:bg-muted dark:text-amber-400'
                    : 'cursor-not-allowed text-muted-foreground/50',
                )}
              >
                <Shield className="size-3.5" aria-hidden />
              </button>
            )}
            {!habit.isArchived && todayCount > 0 && (
              <button
                type="button"
                onClick={() => onUndo(habit)}
                aria-label={t('undoCheckIn')}
                title={t('undoCheckIn')}
                className={ICON_BUTTON_CLASS}
              >
                <Minus className="size-3.5" aria-hidden />
              </button>
            )}
            {/* Same rule as the card: a rescued period offers release, not a
                check-in. The two views must not disagree about whether a day
                can be logged. */}
            {!habit.isArchived &&
              (habit.periodRescued ? (
                <button
                  type="button"
                  onClick={() => onReleaseRescue?.(habit)}
                  disabled={!onReleaseRescue || releasePending}
                  aria-label={t('releaseRescue.action')}
                  title={t('releaseRescue.action')}
                  className="inline-flex size-7 items-center justify-center rounded-md text-amber-600 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-amber-400"
                >
                  <Shield className="size-3.5" aria-hidden />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onCheckIn(habit)}
                  disabled={isCompleted}
                  aria-label={t('checkIn')}
                  title={t('checkIn')}
                  className={cn(
                    'inline-flex size-7 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    isCompleted ? 'cursor-not-allowed text-income' : 'text-primary hover:bg-muted',
                  )}
                >
                  {isCompleted ? (
                    <Check className="size-3.5" aria-hidden />
                  ) : (
                    <Plus className="size-3.5" aria-hidden />
                  )}
                </button>
              ))}
            <button
              type="button"
              onClick={() => onEdit(habit)}
              aria-label={t('editHabit')}
              title={t('editHabit')}
              className={ICON_BUTTON_CLASS}
            >
              <Pencil className="size-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => onArchive(habit)}
              aria-label={habit.isArchived ? tCommon('unarchive') : tCommon('archive')}
              title={habit.isArchived ? tCommon('unarchive') : tCommon('archive')}
              className={ICON_BUTTON_CLASS}
            >
              {habit.isArchived ? (
                <ArchiveRestore className="size-3.5" aria-hidden />
              ) : (
                <Archive className="size-3.5" aria-hidden />
              )}
            </button>
            <button
              type="button"
              onClick={() => onDelete(habit)}
              aria-label={t('deleteHabit')}
              title={t('deleteHabit')}
              className="inline-flex size-7 items-center justify-center rounded-md text-destructive transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          </div>
        );
      },
    },
  ];

  return <DataTable columns={columns} rows={habits} getRowKey={(habit) => habit.id} />;
}
