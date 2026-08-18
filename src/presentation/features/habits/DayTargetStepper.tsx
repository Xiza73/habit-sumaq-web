'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Minus, Plus } from 'lucide-react';

import { cn } from '@/lib/utils';

interface DayTargetStepperProps {
  /** The target that applies to the day being shown. */
  value: number;
  /** Called with the new target. The caller persists it on that day's log. */
  onChange: (next: number) => void;
  /**
   * `false` renders a plain number with no affordance — used for WEEKLY habits
   * (the objective belongs to the week, not to a day) and archived habits.
   */
  editable?: boolean;
  /** Blocks further commits while one is in flight. */
  pending?: boolean;
  className?: string;
}

export function DayTargetStepper({
  value,
  onChange,
  editable = true,
  pending = false,
  className,
}: DayTargetStepperProps) {
  const t = useTranslations('habits.dayTarget');
  const [open, setOpen] = useState(false);

  if (!editable) {
    return <span className={cn('tabular-nums', className)}>{value}</span>;
  }

  function commit(next: number) {
    if (pending || next < 1 || next === value) return;
    onChange(next);
  }

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {open && (
        <button
          type="button"
          onClick={() => commit(value - 1)}
          disabled={value <= 1 || pending}
          className="flex size-5 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-destructive hover:text-destructive disabled:opacity-40 disabled:hover:border-border disabled:hover:text-muted-foreground"
          aria-label={t('decrease')}
        >
          <Minus className="size-3" />
        </button>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'rounded px-0.5 tabular-nums underline decoration-dotted underline-offset-2 transition-colors hover:text-foreground',
          open && 'text-foreground',
        )}
        aria-label={t('edit')}
        aria-expanded={open}
      >
        {value}
      </button>

      {open && (
        <button
          type="button"
          onClick={() => commit(value + 1)}
          disabled={pending}
          className="flex size-5 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
          aria-label={t('increase')}
        >
          <Plus className="size-3" />
        </button>
      )}
    </span>
  );
}
