'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Archive, ArchiveRestore, Check, Eye, Minus, Pencil, Plus, Trash2 } from 'lucide-react';

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
}

const ICON_BUTTON_CLASS =
  'inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

/**
 * Table view of the habits list. Built on the shared `DataTable` primitive and
 * wired to the EXACT handlers the cards use (`onCheckIn`, `onUndo`, `onEdit`,
 * `onArchive`, `onDelete`), so the table exposes the SAME per-habit actions the
 * card does — including opening the habit detail (the whole card is a link) via
 * an explicit "view" action, and the conditional undo (shown only when today's
 * count > 0, matching the card's minus button).
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
}: HabitsTableProps) {
  const t = useTranslations('habits');
  const tCommon = useTranslations('common');

  const columns: DataTableColumn<HabitWithStats>[] = [
    {
      key: 'name',
      header: t('table.name'),
      render: (habit) => <span className="font-medium">{habit.name}</span>,
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
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
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
            <Link
              href={`/habits/${habit.id}`}
              aria-label={t('viewDetail')}
              title={t('viewDetail')}
              className={ICON_BUTTON_CLASS}
            >
              <Eye className="size-3.5" aria-hidden />
            </Link>
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
            {!habit.isArchived && (
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
            )}
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
