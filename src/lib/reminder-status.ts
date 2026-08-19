/**
 * Reminder status and list ordering.
 *
 * Deliberately date-only. The hour gates the *alert*, not the status: a
 * reminder set for 23:00 is still something you have to do today, and a list
 * that called it "upcoming" until 23:00 would be lying about your day.
 */
export type ReminderStatus = 'overdue' | 'today' | 'upcoming' | 'undated' | 'done';

interface ReminderLike {
  remindDate: string | null;
  remindTime?: string | null;
  completed: boolean;
}

export function resolveReminderStatus(reminder: ReminderLike, today: string): ReminderStatus {
  if (reminder.completed) return 'done';
  if (reminder.remindDate === null) return 'undated';
  if (reminder.remindDate < today) return 'overdue';
  if (reminder.remindDate === today) return 'today';
  return 'upcoming';
}

/** Lower sorts first. Mirrors how much the reminder is asking of you today. */
const STATUS_ORDER: Record<ReminderStatus, number> = {
  overdue: 0,
  today: 1,
  upcoming: 2,
  // Last among pending: an undated reminder is not asking for anything yet.
  undated: 3,
  done: 4,
};

/**
 * Comparator for the reminders list. Pass to `Array.prototype.sort`.
 *
 * Buckets by status, then by date ascending within the bucket — which puts
 * the OLDEST overdue reminder first, the one that has been dodged longest.
 * Ties break on time of day, with untimed first because it is due from the
 * start of the day.
 */
export function compareReminders(a: ReminderLike, b: ReminderLike, today: string): number {
  const byStatus =
    STATUS_ORDER[resolveReminderStatus(a, today)] - STATUS_ORDER[resolveReminderStatus(b, today)];
  if (byStatus !== 0) return byStatus;

  if (a.remindDate !== b.remindDate) {
    if (a.remindDate === null) return 1;
    if (b.remindDate === null) return -1;
    return a.remindDate < b.remindDate ? -1 : 1;
  }

  const aTime = a.remindTime ?? null;
  const bTime = b.remindTime ?? null;
  if (aTime === bTime) return 0;
  if (aTime === null) return -1;
  if (bTime === null) return 1;
  return aTime < bTime ? -1 : 1;
}
