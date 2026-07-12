'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Check, Minus, Pause, Play, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import { useLogHabit } from '@/core/application/hooks/use-habits';
import { type HabitWithStats } from '@/core/domain/entities/habit';

import { Modal } from '@/presentation/components/ui/Modal';
import { Select } from '@/presentation/components/ui/Select';

import { playBeep } from '@/lib/beep';
import { getTodayLocaleDate } from '@/lib/format';
import { cn } from '@/lib/utils';

import { useCountdown } from './useCountdown';

interface HabitTimerModalProps {
  open: boolean;
  onClose: () => void;
  habits: HabitWithStats[];
}

const MAX_MINUTES = 999;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${pad(m)}:${pad(s)}`;
}

/**
 * A focus timer: pick a habit, build a countdown (quick-add +5/+10/+30, unit
 * steppers, or type it), run it, and when it hits zero mark the habit as done
 * (+1 to today's count). Frontend-only — it just logs a normal count. One timer
 * at a time, scoped to this modal.
 */
export function HabitTimerModal({ open, onClose, habits }: HabitTimerModalProps) {
  const t = useTranslations('habits.timer');
  const logMutation = useLogHabit();
  const { status, remaining, start, pause, resume, reset } = useCountdown(playBeep);

  const [habitId, setHabitId] = useState('');
  const [minutes, setMinutes] = useState(10);
  const [seconds, setSeconds] = useState(0);

  const selectedHabit = habits.find((h) => h.id === habitId) ?? null;
  const totalSeconds = minutes * 60 + seconds;

  // Reset everything on close so the modal reopens clean.
  function handleClose() {
    reset();
    setHabitId('');
    setMinutes(10);
    setSeconds(0);
    onClose();
  }

  function addMinutes(delta: number) {
    setMinutes((m) => Math.min(MAX_MINUTES, Math.max(0, m + delta)));
  }

  function stepSeconds(delta: number) {
    setSeconds((s) => {
      const next = s + delta;
      if (next < 0) return 0;
      if (next > 59) return 59;
      return next;
    });
  }

  function handleStart() {
    if (!habitId || totalSeconds <= 0) return;
    start(totalSeconds);
  }

  function handleMarkDone() {
    if (!selectedHabit) return;
    const nextCount = (selectedHabit.todayLog?.count ?? 0) + 1;
    logMutation.mutate(
      { habitId: selectedHabit.id, data: { date: getTodayLocaleDate(), count: nextCount } },
      {
        onSuccess: () => {
          toast.success(t('logged', { habit: selectedHabit.name }));
          handleClose();
        },
        onError: () => toast.error(t('logError')),
      },
    );
  }

  const isSetup = status === 'idle';
  const isRunning = status === 'running' || status === 'paused';
  const isDone = status === 'done';

  return (
    <Modal open={open} onClose={handleClose} title={t('title')}>
      {habits.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t('noHabits')}</p>
      ) : isSetup ? (
        <div className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="timer-habit" className="text-sm font-medium">
              {t('habit')}
            </label>
            <Select id="timer-habit" value={habitId} onChange={(e) => setHabitId(e.target.value)}>
              <option value="">{t('habitPlaceholder')}</option>
              {habits.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">{t('duration')}</span>

            {/* Editable MM:SS with unit steppers. */}
            <div className="flex items-center justify-center gap-3">
              <UnitField
                label={t('minutes')}
                value={minutes}
                onChange={(v) => setMinutes(Math.min(MAX_MINUTES, Math.max(0, v)))}
                onStep={(d) => addMinutes(d)}
                max={MAX_MINUTES}
              />
              <span className="pt-5 text-2xl font-bold text-muted-foreground">:</span>
              <UnitField
                label={t('seconds')}
                value={seconds}
                onChange={(v) => setSeconds(Math.min(59, Math.max(0, v)))}
                onStep={(d) => stepSeconds(d)}
                max={59}
              />
            </div>

            {/* Quick add (minutes). */}
            <div className="flex justify-center gap-2 pt-1">
              {[5, 10, 30].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => addMinutes(m)}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
                >
                  +{m}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleStart}
            disabled={!habitId || totalSeconds <= 0}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            <Play className="size-4" />
            {t('start')}
          </button>
        </div>
      ) : (
        <div className="space-y-6 py-2 text-center">
          <p className="text-sm text-muted-foreground">{selectedHabit?.name}</p>

          <div
            className={cn(
              'font-mono text-6xl font-bold tabular-nums',
              isDone ? 'text-primary' : 'text-foreground',
              status === 'paused' && 'text-muted-foreground',
            )}
          >
            {isDone ? '00:00' : formatMMSS(remaining)}
          </div>

          {isRunning && (
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={status === 'running' ? pause : resume}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-border px-5 text-sm font-medium transition-colors hover:bg-muted"
              >
                {status === 'running' ? (
                  <>
                    <Pause className="size-4" /> {t('pause')}
                  </>
                ) : (
                  <>
                    <Play className="size-4" /> {t('resume')}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-border px-5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
              >
                <RotateCcw className="size-4" /> {t('cancel')}
              </button>
            </div>
          )}

          {isDone && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{t('doneTitle')}</p>
              <button
                type="button"
                onClick={handleMarkDone}
                disabled={logMutation.isPending}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                <Check className="size-4" /> {t('markDone')}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex h-10 w-full items-center justify-center rounded-lg text-sm text-muted-foreground transition-colors hover:bg-muted"
              >
                {t('close')}
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

interface UnitFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  onStep: (delta: number) => void;
  max: number;
}

/** A number input with +/- unit steppers, for the minutes / seconds fields. */
function UnitField({ label, value, onChange, onStep, max }: UnitFieldProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <button
        type="button"
        onClick={() => onStep(1)}
        aria-label={`+1 ${label}`}
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        <Plus className="size-4" />
      </button>
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-16 rounded-lg border border-border bg-background text-center font-mono text-2xl font-bold tabular-nums [appearance:textfield] focus:outline-none focus:ring-2 focus:ring-primary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => onStep(-1)}
        aria-label={`-1 ${label}`}
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        <Minus className="size-4" />
      </button>
    </div>
  );
}
