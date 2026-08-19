export interface Reminder {
  id: string;
  title: string;
  notes: string | null;
  /**
   * `YYYY-MM-DD` in the user's timezone, or null.
   *
   * Null means the reminder is a loose note: it is listed, but it never
   * alerts. That is deliberate — nagging about something the user has not
   * scheduled yet would punish writing things down.
   */
  remindDate: string | null;
  /**
   * `HH:mm`, 24h. Always null when `remindDate` is null — a bare hour says
   * nothing about when a one-shot happens, and the backend rejects the
   * combination (`RMDR_008`).
   */
  remindTime: string | null;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
