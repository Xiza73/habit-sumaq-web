'use client';

import { useHabitsWindowSync } from '@/core/application/hooks/use-habits-window-sync';

/**
 * Mount point for the cross-window habit sync. Renders nothing.
 *
 * Lives in the dashboard shell so the MAIN window listens too: the floating
 * popup can check a habit in, and without this the list behind it would keep
 * showing the old count.
 */
export function HabitsWindowSync() {
  useHabitsWindowSync();
  return null;
}
