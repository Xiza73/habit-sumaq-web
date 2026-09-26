'use client';

import { useTranslations } from 'next-intl';

import { Pencil, Trash2 } from 'lucide-react';

import { useDateFormat } from '@/core/application/hooks/use-user-settings';
import { type Reminder } from '@/core/domain/entities/reminder';

import { formatDate, getTodayLocaleDate } from '@/lib/format';
import { type ReminderStatus, resolveReminderStatus } from '@/lib/reminder-status';
import { cn } from '@/lib/utils';

/**
 * Colours for the status chip.
 *
 * Lives beside the row rather than in the list, because BOTH the page and the
 * floating window render this — the same reason `CHORE_STATUS_CLASSES` moved
 * out of its two card copies.
 */
const STATUS_CLASS: Record<ReminderStatus, string> = {
  overdue: 'bg-destructive/10 text-destructive',
  today: 'bg-primary/10 text-primary',
  upcoming: 'bg-muted text-muted-foreground',
  undated: 'bg-muted text-muted-foreground',
  done: 'bg-income/10 text-income',
};

interface ReminderItemProps {
  reminder: Reminder;
  onToggle: (reminder: Reminder) => void;
  /**
   * Administrative actions. Optional as a set: with neither given the row's
   * action cluster is not rendered. The floating window passes neither —
   * editing or deleting from a chrome-less always-on-top window is one
   * misclick from destructive, and the list is right there.
   */
  onEdit?: (reminder: Reminder) => void;
  onDelete?: (reminder: Reminder) => void;
}

/** One reminder row. Extracted so the page and the popup cannot drift apart. */
export function ReminderItem({ reminder, onToggle, onEdit, onDelete }: ReminderItemProps) {
  const t = useTranslations('reminders');
  const tCommon = useTranslations('common');
  const dateFormat = useDateFormat();

  const status = resolveReminderStatus(reminder, getTodayLocaleDate());
  const hasActions = !!onEdit || !!onDelete;

  return (
    <li
      className={cn(
        'group flex items-start gap-3 rounded-xl border border-border bg-card p-4',
        reminder.completed && 'opacity-60',
      )}
    >
      <input
        type="checkbox"
        checked={reminder.completed}
        onChange={() => onToggle(reminder)}
        aria-label={reminder.completed ? t('markPending') : t('markDone')}
        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-input accent-primary"
      />

      <div className="min-w-0 flex-1">
        <p className={cn('font-medium', reminder.completed && 'line-through')}>{reminder.title}</p>
        {reminder.notes && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{reminder.notes}</p>
        )}
        <div className="mt-1.5 flex items-center gap-2">
          <span
            className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', STATUS_CLASS[status])}
          >
            {t(`status.${status}`)}
          </span>
          {reminder.remindDate && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {formatDate(reminder.remindDate, dateFormat)}
              {reminder.remindTime && ` · ${reminder.remindTime}`}
            </span>
          )}
        </div>
      </div>

      {hasActions && (
        <div className="flex items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(reminder)}
              aria-label={tCommon('edit')}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Pencil className="size-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(reminder)}
              aria-label={tCommon('delete')}
              className="flex size-7 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      )}
    </li>
  );
}
