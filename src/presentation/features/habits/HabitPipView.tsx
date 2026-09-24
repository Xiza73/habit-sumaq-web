'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Pause, Play, RotateCcw } from 'lucide-react';
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
const HEIGHT_CARD = 190;
const HEIGHT_WITH_TIMER = 250;

/** Must match the strip's CSS transition, or the two steps desynchronise. */
const REVEAL_MS = 200;

/**
 * Two digits, because the field is `mm:ss` and 999 would make it `mmm:ss`.
 * 99 minutes is well past what a focus timer in a 340px window is for.
 */
const MAX_MINUTES = 99;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * The floating window's contents: the very same `HabitCard`, edge to edge, with
 * a thick bottom bar that opens a timer under it.
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
  const [seconds, setSeconds] = useState(0);

  // The window resize and the strip's own animation have to be SEQUENCED, not
  // fired together. Growing and folding at the same time is what made this
  // look broken: on the way in the strip drew into space the window did not
  // have yet and got clipped, and on the way out the window snapped shut over
  // an animation still playing.
  useEffect(() => {
    if (timerOpen) {
      // Room first, then the strip eases into space that already exists.
      void resizeSelfPip(HEIGHT_WITH_TIMER);
      return;
    }
    // Fold first, shrink after — otherwise the last frames are cut off.
    const id = setTimeout(() => void resizeSelfPip(HEIGHT_CARD), REVEAL_MS);
    return () => clearTimeout(id);
  }, [timerOpen]);

  // `done` has nothing to say in a strip this size — the beep already said it,
  // and the modal's "time is up" copy has no room here. Left alone it parks on
  // 00:00 with no control to get out of it, because reset only shows while the
  // clock is running. Going back to idle leaves the same duration armed for
  // another round.
  useEffect(() => {
    if (status === 'done') reset();
  }, [status, reset]);

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
    return <div className="h-screen w-screen animate-pulse bg-card" />;
  }

  if (!habit) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-card p-4 text-center text-sm text-muted-foreground">
        {t('pip.notFound')}
      </div>
    );
  }

  const isRunning = status === 'running' || status === 'paused';
  const totalSeconds = minutes * 60 + seconds;

  return (
    // `bg-card`, not `bg-background`: there is no frame around the card here.
    // The card IS the window, so anything showing through would read as a
    // border nobody asked for.
    //
    // `data-tauri-drag-region="deep"` makes the whole surface a title bar the
    // window does not have. Tauri stops the drag at any clickable element — a,
    // button, input, anything with a role or tabindex — so every control keeps
    // working and only the empty space moves the window. That is also why the
    // detail link has to go: an <a> wrapping the card would block dragging
    // across most of it.
    //
    // Double-click maximize is deliberately NOT granted in the capability. A
    // 340px floating card filling the screen is nobody idea of a feature.
    <div
      data-tauri-drag-region="deep"
      className="flex h-screen w-screen flex-col overflow-hidden bg-card"
    >
      <HabitCard
        habit={habit}
        // Edge to edge: no rounding, no border, filling whatever height is
        // left. Leftover space would otherwise show as a slab of background
        // under the card.
        className="min-h-0 flex-1 rounded-none border-0 hover:shadow-none"
        disableDetailLink
        onCheckIn={handleCheckIn}
        onUndo={handleUndo}
        // No onEdit / onArchive / onDelete on purpose, which is what drops the
        // overflow menu entirely and leaves the close button in its place. The
        // popup is for acting on the habit, not administering it: editing or
        // deleting from a 340px always-on-top window with no chrome is one
        // misclick from destructive, and the main window is right there.
        onRescueStreak={(h) => rescueMutation.mutate(h.id)}
        streakShields={streakShields}
        rescuePending={rescueMutation.isPending}
        onReleaseRescue={(h) =>
          releaseMutation.mutate({ habitId: h.id, date: getTodayLocaleDate() })
        }
        releasePending={releaseMutation.isPending}
        onClosePip={() => void closeSelfPip()}
      />

      {/*
        The thick bottom bar IS the button. An undecorated window has no title
        bar to hang a control off, and the grip line inside it is what stops a
        coloured strip from reading as decoration.
      */}
      <button
        type="button"
        onClick={() => setTimerOpen((v) => !v)}
        aria-label={timerOpen ? t('pip.timerHide') : t('pip.timer')}
        title={timerOpen ? t('pip.timerHide') : t('pip.timer')}
        className={cn(
          'group/bar flex h-6 w-full shrink-0 items-center justify-center border-t transition-colors',
          timerOpen
            ? 'border-primary bg-primary/80 hover:bg-primary'
            : 'border-border bg-muted hover:bg-primary/30',
        )}
      >
        <span
          className={cn(
            'h-1 w-10 rounded-full transition-colors',
            timerOpen
              ? 'bg-primary-foreground/70'
              : 'bg-muted-foreground/50 group-hover/bar:bg-primary',
          )}
        />
      </button>

      {/*
        Always mounted, animating between zero and auto height via grid rows —
        a plain conditional render pops in with no transition to play, and a
        fixed pixel height would cut off whatever the strip actually needs.
        `inert` keeps the collapsed controls out of the tab order.
      */}
      <div
        inert={!timerOpen}
        className={cn(
          'grid shrink-0 overflow-hidden transition-[grid-template-rows] duration-200 ease-out',
          timerOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex shrink-0 items-center justify-between gap-2 bg-card px-3 py-2">
            {isRunning ? (
              <span className="font-mono text-2xl font-bold tabular-nums">
                {pad(Math.floor(remaining / 60))}:{pad(remaining % 60)}
              </span>
            ) : (
              // Typable, not just tappable. Steppers alone mean 37 minutes costs
              // eight clicks, and the keyboard is right there.
              <div className="flex items-center gap-1 font-mono text-2xl font-bold tabular-nums">
                <TimeField
                  label={t('timer.minutes')}
                  value={minutes}
                  max={MAX_MINUTES}
                  onChange={setMinutes}
                />
                <span className="text-muted-foreground">:</span>
                <TimeField
                  label={t('timer.seconds')}
                  value={seconds}
                  max={59}
                  onChange={setSeconds}
                />
              </div>
            )}

            {isRunning ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={status === 'running' ? pause : resume}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={status === 'running' ? t('timer.pause') : t('timer.resume')}
                >
                  {status === 'running' ? (
                    <Pause className="size-4" />
                  ) : (
                    <Play className="size-4" />
                  )}
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
                    onClick={() => setMinutes((v) => Math.min(MAX_MINUTES, v + m))}
                    className="rounded-md border border-border px-2 py-1 text-xs font-medium transition-colors hover:bg-muted"
                  >
                    +{m}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => start(totalSeconds)}
                  disabled={totalSeconds <= 0}
                  className="rounded-md bg-primary p-1.5 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                  aria-label={t('timer.start')}
                >
                  <Play className="size-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * One `mm` or `ss` slot of the timer.
 *
 * Text, not `type="number"`: a number input cannot render a leading zero, so
 * it shows `15:0` where the format says `15:00`. Here the value is always
 * padded and the input only ever accepts digits.
 *
 * Typing keeps the LAST two digits, the way a clock field behaves — type `5`
 * into seconds and it reads `05`, type `3` after it and it reads `53`, with no
 * need to select and delete first.
 */
function TimeField({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={pad(value)}
      aria-label={label}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '').slice(-2);
        onChange(Math.min(max, Number(digits) || 0));
      }}
      className="w-12 rounded-md border border-border bg-background text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
    />
  );
}
