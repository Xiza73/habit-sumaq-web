'use client';

import { useTranslations } from 'next-intl';

import { Check, Pencil, Plus } from 'lucide-react';

import { type HabitWithStats } from '@/core/domain/entities/habit';

import { DataTable, type DataTableColumn } from '@/presentation/components/ui/DataTable';

import { cn } from '@/lib/utils';

interface HabitsTableProps {
  habits: HabitWithStats[];
  /** Log one check-in for the habit (same handler the cards use). */
  onCheckIn: (habit: HabitWithStats) => void;
  /** Open the edit form for the habit (same handler the cards use). */
  onEdit: (habit: HabitWithStats) => void;
}

/**
 * Table view of the habits list. Built on the shared `DataTable` primitive and
 * wired to the EXACT handlers the cards use (`onCheckIn`, `onEdit`), so
 * behavior is identical between the cards and the table.
 *
 * The focus-timer is intentionally left out of the table: it is a list-level
 * action (a single header button in `HabitList`, not a per-habit control), so
 * it stays in the header regardless of the active view mode.
 */
export function HabitsTable({ habits, onCheckIn, onEdit }: HabitsTableProps) {
  const t = useTranslations('habits');

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
        const periodCount = habit.periodCount ?? habit.todayLog?.count ?? 0;
        const isCompleted = habit.periodCompleted ?? periodCount >= habit.targetCount;
        const progress = Math.min(periodCount / habit.targetCount, 1);
        return (
          <div className="flex items-center gap-2">
            <span className="w-10 shrink-0 tabular-nums text-muted-foreground">
              {periodCount}/{habit.targetCount}
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
        const periodCount = habit.periodCount ?? habit.todayLog?.count ?? 0;
        const isCompleted = habit.periodCompleted ?? periodCount >= habit.targetCount;
        return (
          <div className="flex items-center justify-end gap-1">
            {!habit.isArchived && (
              <button
                type="button"
                onClick={() => onCheckIn(habit)}
                disabled={isCompleted}
                aria-label={t('checkIn')}
                title={t('checkIn')}
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  isCompleted ? 'cursor-not-allowed text-income' : 'text-primary hover:bg-muted',
                )}
              >
                {isCompleted ? (
                  <Check className="size-3.5" aria-hidden />
                ) : (
                  <Plus className="size-3.5" aria-hidden />
                )}
                {t('checkIn')}
              </button>
            )}
            <button
              type="button"
              onClick={() => onEdit(habit)}
              aria-label={t('editHabit')}
              title={t('editHabit')}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Pencil className="size-3.5" aria-hidden />
              {t('editHabit')}
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={habits}
      getRowKey={(habit) => habit.id}
      emptyMessage={t('emptyState')}
    />
  );
}
