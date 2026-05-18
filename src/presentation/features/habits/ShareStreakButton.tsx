'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Share2 } from 'lucide-react';

import { type HabitWithStats } from '@/core/domain/entities/habit';

import { StreakCardModal } from './StreakCardModal';

interface ShareStreakButtonProps {
  habit: HabitWithStats;
}

/**
 * "Compartir mi racha" CTA. Shown next to the streak number on the habit
 * detail page only when the streak is worth bragging about (≥ 7 days).
 * Below 7 the button hides — we don't want users sharing a 2-day streak
 * and undermining the "look how consistent I am" pitch.
 */
const MIN_DAYS_TO_SHARE = 7;

export function ShareStreakButton({ habit }: ShareStreakButtonProps) {
  const t = useTranslations('habits.streakCard');
  const [open, setOpen] = useState(false);

  if (habit.currentStreak < MIN_DAYS_TO_SHARE) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('shareAction')}
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Share2 className="size-3.5" />
        {t('shareAction')}
      </button>

      <StreakCardModal
        open={open}
        habitId={habit.id}
        habitName={habit.name}
        days={habit.currentStreak}
        color={habit.color}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
