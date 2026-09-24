'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Pause, Play, RotateCcw, Timer } from 'lucide-react';
import { toast } from 'sonner';

import {
  useHabit,
  useLogHabit,
  useReleaseRescue,
  useRescueStreak,
} from '@/core/application/hooks/use-habits';
import { useHabitsWindowSync } from '@/core/application/hooks/use-habits-window-sync';
import { useStreakShields } from '@/core/application/hooks/use-user-settings';
import { type HabitWithStats } from '@/core/domain/entities/habit';

import { playBeep } from '@/lib/beep';
import { getTodayLocaleDate } from '@/lib/format';
import { closeSelfPip, resizeSelfPip } from '@/lib/pip-window';
import { cn } from '@/lib/utils';

import { HabitCard } from './HabitCard';
import { useCountdown } from './useCountdown';

/** Window heights, card-only and card-plus-timer. Kept next to the strip. */
const HEIGHT_CARD = 260;
const HEIGHT_WITH_TIMER = 330;

function formatMMSS(total: number): string {
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * The floating window's contents: the very same `HabitCard`, plus a thick
 * bottom strip that opens a timer under it.
 *
 * It renders `HabitCard` rather than a lookalike on purpose. A second copy of
 * the card would drift from the original the first time either was touched —
 * the same failure the chore status colours had, where two views disagreed
 * about the same row and nothing noticed.
 */
export function HabitPipView({ habitId }: { habitId: string }) {
  const t = useTranslations('habits');
  useHabitsWindowSync();

  const { data: habit, isLoading } = useHabit(habitId);
  const logMutation = useLogHabit();
  const rescueMutation = useRescueStreak();
  const releaseMutation = useReleaseRescue();
  const streakShields = useStreakShields();

  const [timerOpen, setTimerOpen] = useState(false);
  const { status, remaining, start, pause, resume, reset } = useCountdown(playBeep);
  const [minutes, setMinutes] = useState(10);

  // The window is sized to the card, so opening the strip has to make room or
  // the timer renders outside the frame and is simply invisible.
  useEffect(() => {
    void resizeSelfPip(timerOpen ? HEIGHT_WITH_TIMER : HEIGHT_CARD);
  }, [timerOpen]);

  function handleCheckIn(target: HabitWithStats) {
    if (target.periodCompleted) return;
    const currentCount = target.todayLog?.count ?? 0;
    if (currentCount >= target.periodTarget) return;
    logMutation.mutate(
      { habitId: target.id, data: { date: getTodayLocaleDate(), count: currentCount + 1 } },
      { onError: () => toast.error(t('pip.notFound')) },
    );
  }

  function handleUndo(target: HabitWithStats) {
    const currentCount = target.todayLog?.count ?? 0;
    if (currentCount <= 0) return;
    logMutation.mutate({
      habitId: target.id,
      data: { date: getTodayLocaleDate(), count: currentCount - 1 },
    });
  }

  if (isLoading) {
    return <div className="h-screen w-screen animate-pulse bg-muted" />;
  }

  if (!habit) {
    return (
      <div className="flex h-screen w-screen items-center justify-center p-4 text-center text-sm text-muted-foreground">
        {t('pip.notFound')}
      </div>
    );
  }

  const isRunning = status === 'running' || status === 'paused';

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <div className="min-h-0 flex-1 p-2">
        <HabitCard
          habit={habit}
          onCheckIn={handleCheckIn}
          onUndo={handleUndo}
          // The popup is for acting on the habit, not administering it.
          // Editing or deleting from a 340px always-on-top window with no
          // chrome is one misclick from destructive, and the main window is
          // right there.
          onEdit={() => undefined}
          onArchive={() => undefined}
          onDelete={() => undefined}
          onRescueStreak={(h) => rescueMutation.mutate(h.id)}
          streakShields={streakShields}
          rescuePending={rescueMutation.isPending}
          onReleaseRescue={(h) =>
            releaseMutation.mutate({ habitId: h.id, date: getTodayLocaleDate() })
          }
          releasePending={releaseMutation.isPending}
          onClosePip={() => void closeSelfPip()}
        />
      </div>

      {/*
        The thick bottom border IS the button. An undecorated window has no
        title bar to hang a control off, and a normal-sized button would eat
        card space — this reads as an edge until you hover it.
      */}
      <button
        type="button"
        onClick={() => setTimerOpen((v) => !v)}
        aria-label={timerOpen ? t('pip.timerHide') : t('pip.timer')}
        title={timerOpen ? t('pip.timerHide') : t('pip.timer')}
        className={cn(
          'flex h-2.5 w-full shrink-0 items-center justify-center transition-colors',
          timerOpen ? 'bg-primary' : 'bg-border hover:bg-primary/60',
        )}
      >
        <Timer className="size-2.5 text-primary-foreground opacity-0 transition-opacity hover:opacity-100" />
      </button>

      {timerOpen && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border bg-card px-3 py-2">
          <span className="font-mono text-xl font-bold tabular-nums">
            {formatMMSS(isRunning || status === 'done' ? remaining : minutes * 60)}
          </span>

          {isRunning ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={status === 'running' ? pause : resume}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={status === 'running' ? t('timer.pause') : t('timer.resume')}
              >
                {status === 'running' ? <Pause className="size-4" /> : <Play className="size-4" />}
              </button>
              <button
                type="button"
                onClick={reset}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={t('timer.cancel')}
              >
                <RotateCcw className="size-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              {[5, 10].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMinutes((v) => Math.min(999, v + m))}
                  className="rounded-md border border-border px-2 py-1 text-xs font-medium transition-colors hover:bg-muted"
                >
                  +{m}
                </button>
              ))}
              <button
                type="button"
                onClick={() => start(minutes * 60)}
                disabled={minutes <= 0}
                className="rounded-md bg-primary p-1.5 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                aria-label={t('timer.start')}
              >
                <Play className="size-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
