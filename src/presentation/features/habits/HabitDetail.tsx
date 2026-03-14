'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { ArrowLeft, Check, Flame, Loader2, Minus, Plus, Target, TrendingUp } from 'lucide-react';

import {
  useArchiveHabit,
  useDeleteHabit,
  useHabit,
  useHabitLogs,
  useLogHabit,
} from '@/core/application/hooks/use-habits';

import { ApiError } from '@/infrastructure/api/api-error';

import { ConfirmDialog } from '@/presentation/components/feedback/ConfirmDialog';

import { getTodayLocaleDate } from '@/lib/format';
import { cn } from '@/lib/utils';

import { HabitForm } from './HabitForm';
import { HabitHeatmap } from './HabitHeatmap';

interface HabitDetailProps {
  habitId: string;
}

export function HabitDetail({ habitId }: HabitDetailProps) {
  const router = useRouter();
  const t = useTranslations('habits');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');

  const { data: habit, isLoading } = useHabit(habitId);
  const { data: logsData } = useHabitLogs(habitId, { limit: 365 });
  const archiveMutation = useArchiveHabit();
  const deleteMutation = useDeleteHabit();
  const logMutation = useLogHabit();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleCheckIn() {
    if (!habit) return;
    if (habit.periodCompleted) return;
    const todayCount = habit.todayLog?.count ?? 0;
    if (todayCount >= habit.targetCount) return;
    const today = getTodayLocaleDate();
    const newCount = todayCount + 1;

    logMutation.mutate(
      { habitId: habit.id, data: { date: today, count: newCount } },
      {
        onError: (error) => {
          if (error instanceof ApiError && error.code && tErrors.has(error.code)) {
            // error handled by toast in mutation
          }
        },
      },
    );
  }

  function handleUndo() {
    if (!habit) return;
    const todayCount = habit.todayLog?.count ?? 0;
    if (todayCount <= 0) return;
    const today = getTodayLocaleDate();

    logMutation.mutate(
      { habitId: habit.id, data: { date: today, count: todayCount - 1 } },
      {
        onError: (error) => {
          if (error instanceof ApiError && error.code && tErrors.has(error.code)) {
            // error handled by toast in mutation
          }
        },
      },
    );
  }

  function handleDelete() {
    setDeleteError(null);
    deleteMutation.mutate(habitId, {
      onSuccess: () => router.replace('/habits'),
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!habit) {
    return <div className="py-12 text-center text-muted-foreground">{tErrors('HAB_001')}</div>;
  }

  const todayCount = habit.todayLog?.count ?? 0;
  const periodCount = habit.periodCount ?? todayCount;
  const isCompleted = habit.periodCompleted ?? periodCount >= habit.targetCount;
  const progress = Math.min(periodCount / habit.targetCount, 1);
  const completionPercent = Math.round(habit.completionRate * 100);
  const logs = logsData?.data ?? [];

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {tCommon('back')}
      </button>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="flex size-14 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: habit.color ? `${habit.color}20` : undefined }}
            >
              <Target className="size-7" style={{ color: habit.color ?? undefined }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{habit.name}</h1>
              <p className="text-sm text-muted-foreground">
                {t(`frequencies.${habit.frequency}`)}
                {habit.description && ` · ${habit.description}`}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              {tCommon('edit')}
            </button>
            <button
              type="button"
              onClick={() => archiveMutation.mutate(habitId)}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              {habit.isArchived ? tCommon('unarchive') : tCommon('archive')}
            </button>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="rounded-md border border-destructive px-3 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              {tCommon('delete')}
            </button>
          </div>
        </div>

        {/* Today's progress */}
        <div className="mt-6 border-t border-border pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {habit.frequency === 'WEEKLY' ? t('weeklyProgress') : t('todayProgress')}
              </p>
              <p className="mt-1 text-3xl font-bold tabular-nums">
                {periodCount}
                <span className="text-lg text-muted-foreground">/{habit.targetCount}</span>
              </p>
            </div>
            {!habit.isArchived && (
              <div className="flex items-center gap-2">
                {todayCount > 0 && (
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={logMutation.isPending}
                    className="flex size-10 items-center justify-center rounded-full border-2 border-border text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                    aria-label={t('undoCheckIn')}
                  >
                    <Minus className="size-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCheckIn}
                  disabled={isCompleted || logMutation.isPending}
                  className={cn(
                    'flex size-12 items-center justify-center rounded-full transition-colors',
                    isCompleted
                      ? 'bg-income/20 text-income'
                      : 'border-2 border-primary text-primary hover:bg-primary/10',
                  )}
                  aria-label={t('checkIn')}
                >
                  {logMutation.isPending ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : isCompleted ? (
                    <Check className="size-5" />
                  ) : (
                    <Plus className="size-5" />
                  )}
                </button>
              </div>
            )}
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                isCompleted ? 'bg-income' : 'bg-primary',
              )}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Flame className="size-4 text-orange-500" />
            {t('currentStreak')}
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {habit.currentStreak}{' '}
            <span className="text-sm font-normal text-muted-foreground">
              {habit.frequency === 'DAILY'
                ? t('days', { count: habit.currentStreak }).split(' ')[1]
                : t('weeks', { count: habit.currentStreak }).split(' ')[1]}
            </span>
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="size-4 text-primary" />
            {t('longestStreak')}
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {habit.longestStreak}{' '}
            <span className="text-sm font-normal text-muted-foreground">
              {habit.frequency === 'DAILY'
                ? t('days', { count: habit.longestStreak }).split(' ')[1]
                : t('weeks', { count: habit.longestStreak }).split(' ')[1]}
            </span>
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Target className="size-4 text-primary" />
            {t('completionRate')}
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {completionPercent}
            <span className="text-sm font-normal text-muted-foreground">%</span>
          </p>
        </div>
      </div>

      {/* Heatmap */}
      <HabitHeatmap logs={logs} targetCount={habit.targetCount} color={habit.color} />

      <HabitForm open={editOpen} habit={habit} onClose={() => setEditOpen(false)} />

      <ConfirmDialog
        open={deleteOpen}
        title={t('deleteHabit')}
        description={deleteError ?? `${t('deleteConfirm')} ${t('deleteWarning')}`}
        variant="destructive"
        confirmLabel={t('deleteHabit')}
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteOpen(false);
          setDeleteError(null);
        }}
      />
    </div>
  );
}
