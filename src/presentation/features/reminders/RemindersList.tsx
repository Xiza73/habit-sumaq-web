'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Bell, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';

import {
  useDeleteReminder,
  useReminders,
  useUpdateReminder,
} from '@/core/application/hooks/use-reminders';
import { useDateFormat } from '@/core/application/hooks/use-user-settings';
import { type Reminder } from '@/core/domain/entities/reminder';

import { ConfirmDialog } from '@/presentation/components/feedback/ConfirmDialog';

import { formatDate, getTodayLocaleDate } from '@/lib/format';
import {
  compareReminders,
  type ReminderStatus,
  resolveReminderStatus,
} from '@/lib/reminder-status';
import { cn } from '@/lib/utils';

import { ReminderForm } from './ReminderForm';

const STATUS_CLASS: Record<ReminderStatus, string> = {
  overdue: 'bg-destructive/10 text-destructive',
  today: 'bg-primary/10 text-primary',
  upcoming: 'bg-muted text-muted-foreground',
  undated: 'bg-muted text-muted-foreground',
  done: 'bg-income/10 text-income',
};

export function RemindersList() {
  const t = useTranslations('reminders');
  const tCommon = useTranslations('common');
  const dateFormat = useDateFormat();

  const { data: reminders, isLoading } = useReminders();
  const updateMutation = useUpdateReminder();
  const deleteMutation = useDeleteReminder();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [deleting, setDeleting] = useState<Reminder | null>(null);

  const today = getTodayLocaleDate();

  const ordered = useMemo(
    () => [...(reminders ?? [])].sort((a, b) => compareReminders(a, b, today)),
    [reminders, today],
  );

  function handleToggle(reminder: Reminder) {
    updateMutation.mutate({ id: reminder.id, data: { completed: !reminder.completed } });
  }

  function handleEdit(reminder: Reminder) {
    setEditing(reminder);
    setFormOpen(true);
  }

  function handleCloseForm() {
    setFormOpen(false);
    setEditing(null);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" />
          {t('createReminder')}
        </button>
      </div>

      {ordered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <Bell className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">{t('emptyState')}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {ordered.map((reminder) => {
            const status = resolveReminderStatus(reminder, today);
            return (
              <li
                key={reminder.id}
                className={cn(
                  'group flex items-start gap-3 rounded-xl border border-border bg-card p-4',
                  reminder.completed && 'opacity-60',
                )}
              >
                <input
                  type="checkbox"
                  checked={reminder.completed}
                  onChange={() => handleToggle(reminder)}
                  aria-label={reminder.completed ? t('markPending') : t('markDone')}
                  className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-input accent-primary"
                />

                <div className="min-w-0 flex-1">
                  <p className={cn('font-medium', reminder.completed && 'line-through')}>
                    {reminder.title}
                  </p>
                  {reminder.notes && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {reminder.notes}
                    </p>
                  )}
                  <div className="mt-1.5 flex items-center gap-2">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-medium',
                        STATUS_CLASS[status],
                      )}
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

                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={() => handleEdit(reminder)}
                    aria-label={tCommon('edit')}
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(reminder)}
                    aria-label={tCommon('delete')}
                    className="flex size-7 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ReminderForm open={formOpen} reminder={editing} onClose={handleCloseForm} />

      <ConfirmDialog
        open={!!deleting}
        title={t('deleteReminder')}
        description={t('deleteConfirm')}
        variant="destructive"
        confirmLabel={tCommon('delete')}
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleting) {
            deleteMutation.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
          }
        }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
