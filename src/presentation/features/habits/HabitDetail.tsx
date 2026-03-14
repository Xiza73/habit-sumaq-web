'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { ArrowLeft, Check, Flame, Loader2, Plus, Target, TrendingUp } from 'lucide-react';

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

interface HabitDetailProps {
  habitId: string;
}

export function HabitDetail({ habitId }: HabitDetailProps) {
  const router = useRouter();
  const t = useTranslations('habits');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');

  const { data: habit, isLoading } = useHabit(habitId);
  const { data: logsData } = useHabitLogs(habitId, { limit: 30 });
  const archiveMutation = useArchiveHabit();
  const deleteMutation = useDeleteHabit();
  const logMutation = useLogHabit();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleCheckIn() {
    if (!habit) return;
    const todayCount = habit.todayLog?.count ?? 0;
    if (todayCount >= habit.targetCount) return;
    const today = getTodayLocaleDate();
    const newCount = (habit.todayLog?.count ?? 0) + 1;

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
  const isCompleted = todayCount >= habit.targetCount;
  const progress = Math.min(todayCount / habit.targetCount, 1);
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
              <p className="text-sm text-muted-foreground">{t('todayProgress')}</p>
              <p className="mt-1 text-3xl font-bold tabular-nums">
                {todayCount}
                <span className="text-lg text-muted-foreground">/{habit.targetCount}</span>
              </p>
            </div>
            {!habit.isArchived && (
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
                ? t('days', { count: habit.currentStreak })
                : t('weeks', { count: habit.currentStreak })}
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
                ? t('days', { count: habit.longestStreak })
                : t('weeks', { count: habit.longestStreak })}
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

      {/* Log history */}
      {logs.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-6 py-4">
            <h2 className="font-semibold">{t('history')}</h2>
          </div>
          <div className="divide-y divide-border">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex size-8 items-center justify-center rounded-full',
                      log.completed ? 'bg-income/20 text-income' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {log.completed ? (
                      <Check className="size-4" />
                    ) : (
                      <span className="text-xs tabular-nums">{log.count}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{log.date}</p>
                    {log.note && <p className="text-xs text-muted-foreground">{log.note}</p>}
                  </div>
                </div>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {log.count}/{habit.targetCount}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
