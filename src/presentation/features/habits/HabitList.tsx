'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { ChevronLeft, ChevronRight, Clock, Eye, EyeOff, Plus } from 'lucide-react';
import { toast } from 'sonner';

import {
  useArchiveHabit,
  useDailyHabits,
  useDeleteHabit,
  useHabits,
  useLogHabit,
} from '@/core/application/hooks/use-habits';
import { useUserSettings } from '@/core/application/hooks/use-user-settings';
import { type HabitWithStats } from '@/core/domain/entities/habit';

import { ApiError } from '@/infrastructure/api/api-error';

import { ConfirmDialog } from '@/presentation/components/feedback/ConfirmDialog';

import { formatDate, getTodayLocaleDate } from '@/lib/format';
import { cn } from '@/lib/utils';

import { HabitCard } from './HabitCard';
import { HabitCardSkeleton } from './HabitCardSkeleton';
import { HabitForm } from './HabitForm';

function LiveClock() {
  const [currentTime, setCurrentTime] = useState(() => new Date().toLocaleTimeString());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
      <Clock className="size-3" />
      {currentTime}
    </div>
  );
}

function shiftDate(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function HabitList() {
  const t = useTranslations('habits');
  const tErrors = useTranslations('errors');
  const { data: settings } = useUserSettings();
  const dateFormat = settings?.dateFormat ?? 'YYYY-MM-DD';

  const [showArchived, setShowArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitWithStats | null>(null);
  const [deletingHabit, setDeletingHabit] = useState<HabitWithStats | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(getTodayLocaleDate);

  const today = getTodayLocaleDate();
  const isToday = selectedDate === today;

  const { data: dailyHabits, isLoading: isDailyLoading } = useDailyHabits(selectedDate);
  const { data: allHabits, isLoading: isAllLoading } = useHabits(showArchived);
  const archiveMutation = useArchiveHabit();
  const deleteMutation = useDeleteHabit();
  const logMutation = useLogHabit();

  const habits = showArchived ? allHabits : dailyHabits;
  const isLoading = showArchived ? isAllLoading : isDailyLoading;

  function handlePrevDay() {
    setSelectedDate((prev) => shiftDate(prev, -1));
  }

  function handleNextDay() {
    if (isToday) return;
    setSelectedDate((prev) => {
      const next = shiftDate(prev, 1);
      return next > today ? today : next;
    });
  }

  function handleEdit(habit: HabitWithStats) {
    setEditingHabit(habit);
    setFormOpen(true);
  }

  function handleCloseForm() {
    setFormOpen(false);
    setEditingHabit(null);
  }

  function handleCheckIn(habit: HabitWithStats) {
    if (habit.periodCompleted) return;
    const currentCount = habit.todayLog?.count ?? 0;
    if (currentCount >= habit.targetCount) return;

    logMutation.mutate(
      { habitId: habit.id, data: { date: selectedDate, count: currentCount + 1 } },
      {
        onError: (error) => {
          if (error instanceof ApiError && error.code && tErrors.has(error.code)) {
            toast.error(tErrors(error.code as 'HAB_003'));
          } else {
            toast.error(tErrors('generic'));
          }
        },
      },
    );
  }

  function handleUndo(habit: HabitWithStats) {
    const currentCount = habit.todayLog?.count ?? 0;
    if (currentCount <= 0) return;

    logMutation.mutate(
      { habitId: habit.id, data: { date: selectedDate, count: currentCount - 1 } },
      {
        onError: (error) => {
          if (error instanceof ApiError && error.code && tErrors.has(error.code)) {
            toast.error(tErrors(error.code as 'HAB_003'));
          } else {
            toast.error(tErrors('generic'));
          }
        },
      },
    );
  }

  function handleArchive(habit: HabitWithStats) {
    archiveMutation.mutate(habit.id, {
      onSuccess: (updated) => {
        toast.success(updated.isArchived ? t('archiveHabit') : t('editHabit'));
      },
    });
  }

  function handleDeleteConfirm() {
    if (!deletingHabit) return;
    setDeleteError(null);
    deleteMutation.mutate(deletingHabit.id, {
      onSuccess: () => {
        setDeletingHabit(null);
        toast.success(t('deleteHabit'));
      },
      onError: (error) => {
        if (error instanceof ApiError && error.code && tErrors.has(error.code)) {
          setDeleteError(tErrors(error.code as 'HAB_001'));
        } else {
          setDeleteError(tErrors('generic'));
        }
      },
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="h-10 w-36 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <HabitCardSkeleton />
          <HabitCardSkeleton />
          <HabitCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-muted"
            title={showArchived ? 'Hide archived' : 'Show archived'}
          >
            {showArchived ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingHabit(null);
              setFormOpen(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="size-4" />
            {t('createHabit')}
          </button>
        </div>
      </div>

      {/* Date navigator */}
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={handlePrevDay}
              className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted"
              aria-label="Previous day"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={handleNextDay}
              disabled={isToday}
              className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
              aria-label="Next day"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm font-medium capitalize">
              {isToday ? t('today') : formatDate(selectedDate, dateFormat)}
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {formatDate(selectedDate, dateFormat)}
            </p>
          </div>

          <div className="flex flex-1 items-center justify-end gap-2">
            <LiveClock />
            {!isToday && (
              <button
                type="button"
                onClick={() => setSelectedDate(today)}
                className="rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {t('today')}
              </button>
            )}
          </div>
        </div>

        {!isToday && (
          <p className={cn('text-center text-xs text-amber-600 dark:text-amber-400')}>
            {t('pastDateNotice')}
          </p>
        )}
      </div>

      {!habits?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <p className="max-w-xs text-muted-foreground">{t('emptyState')}</p>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="size-4" />
            {t('createHabit')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              onCheckIn={handleCheckIn}
              onUndo={handleUndo}
              onEdit={handleEdit}
              onArchive={handleArchive}
              onDelete={setDeletingHabit}
            />
          ))}
        </div>
      )}

      <HabitForm open={formOpen} habit={editingHabit} onClose={handleCloseForm} />

      <ConfirmDialog
        open={!!deletingHabit}
        title={t('deleteHabit')}
        description={deleteError ?? `${t('deleteConfirm')} ${t('deleteWarning')}`}
        variant="destructive"
        confirmLabel={t('deleteHabit')}
        loading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeletingHabit(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
}
