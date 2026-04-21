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
  Target,
  Trash2,
} from 'lucide-react';

import { type HabitWithStats } from '@/core/domain/entities/habit';

import { getStreakStyle } from '@/lib/streak-styles';
import { cn } from '@/lib/utils';

interface HabitCardProps {
  habit: HabitWithStats;
  onCheckIn: (habit: HabitWithStats) => void;
  onUndo: (habit: HabitWithStats) => void;
  onEdit: (habit: HabitWithStats) => void;
  onArchive: (habit: HabitWithStats) => void;
  onDelete: (habit: HabitWithStats) => void;
}

export function HabitCard({
  habit,
  onCheckIn,
  onUndo,
  onEdit,
  onArchive,
  onDelete,
}: HabitCardProps) {
  const t = useTranslations('habits');
  const tCommon = useTranslations('common');
  const [menuOpen, setMenuOpen] = useState(false);

  const todayCount = habit.todayLog?.count ?? 0;
  const periodCount = habit.periodCount ?? todayCount;
  const isCompleted = habit.periodCompleted ?? periodCount >= habit.targetCount;
  const progress = Math.min(periodCount / habit.targetCount, 1);
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
          <span className="text-xs tabular-nums text-muted-foreground">
            {periodCount}/{habit.targetCount}
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
          </div>
        )}
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            isCompleted ? 'bg-income' : 'bg-primary',
          )}
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {habit.isArchived && (
        <div className="mt-3 rounded-md bg-muted px-2 py-1 text-center text-xs text-muted-foreground">
          {tCommon('archive')}
        </div>
      )}
    </div>
  );
}
