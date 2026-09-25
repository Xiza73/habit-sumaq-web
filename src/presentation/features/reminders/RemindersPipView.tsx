'use client';

import { useTranslations } from 'next-intl';

import { usePipWindowSync } from '@/core/application/hooks/use-pip-window-sync';
import {
  remindersKeys,
  useReminders,
  useUpdateReminder,
} from '@/core/application/hooks/use-reminders';
import { type Reminder } from '@/core/domain/entities/reminder';

import { PipShell } from '@/presentation/features/pip/PipShell';

import { getTodayLocaleDate } from '@/lib/format';
import { compareReminders } from '@/lib/reminder-status';

import { ReminderItem } from './ReminderItem';

/** What this window shows, and therefore what it refetches on a broadcast. */
const WATCHED_KEYS = [remindersKeys.all];

/**
 * The floating window for reminders: the whole list, not one per reminder.
 *
 * A reminder is a single line with a checkbox — one window each would be five
 * windows to glance at the same five lines. The per-item popups exist where
 * the item carries enough on its own to be worth a window.
 *
 * Rows come from `ReminderItem`, the same component the page uses. A second
 * copy would drift the first time either was touched.
 */
export function RemindersPipView() {
  const t = useTranslations('reminders');
  usePipWindowSync(WATCHED_KEYS);

  const { data: reminders, isLoading } = useReminders();
  const updateMutation = useUpdateReminder();

  function handleToggle(reminder: Reminder) {
    updateMutation.mutate({ id: reminder.id, data: { completed: !reminder.completed } });
  }

  if (isLoading) {
    return <div className="h-screen w-screen animate-pulse bg-card" />;
  }

  // Same ordering the page uses — `compareReminders` needs today to place the
  // overdue ones first.
  const today = getTodayLocaleDate();
  const ordered = [...(reminders ?? [])].sort((a, b) => compareReminders(a, b, today));

  return (
    <PipShell title={t('title')}>
      {ordered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t('emptyState')}</p>
      ) : (
        <ul className="space-y-2">
          {ordered.map((reminder) => (
            // No onEdit / onDelete: this window is for ticking things off, and
            // the list is right there for the rest.
            <ReminderItem key={reminder.id} reminder={reminder} onToggle={handleToggle} />
          ))}
        </ul>
      )}
    </PipShell>
  );
}
