'use client';

import { useTranslations } from 'next-intl';

import { useCelebrationStore } from '@/core/application/stores/celebration.store';

import { StreakCardModal } from './StreakCardModal';

/**
 * Globally-mounted wrapper around `<StreakCardModal>` that listens to the
 * celebration store and pops the modal when `useLogHabit` crosses a big
 * milestone. Lives at the dashboard layout level so the modal shows up
 * regardless of which route the user was on when they logged the habit.
 *
 * Big = month (30 days), century (100 days), year (365 days). Week is
 * intentionally skipped — the toast + confetti combo from `useLogHabit`
 * already handles that cadence and an extra modal would feel naggy.
 */
export function CelebrationModal() {
  const t = useTranslations('habits.streakCard');
  const active = useCelebrationStore((s) => s.active);
  const dismiss = useCelebrationStore((s) => s.dismiss);

  if (!active) return null;

  return (
    <StreakCardModal
      open
      habitId={active.habitId}
      habitName={active.habitName}
      days={active.days}
      color={active.color}
      onClose={dismiss}
      title={t('celebrationTitle')}
      subtitle={t('celebrationSubtitle')}
    />
  );
}
