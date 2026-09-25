'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { Bell, Loader2, PictureInPicture2, Plus } from 'lucide-react';
import { toast } from 'sonner';

import {
  useDeleteReminder,
  useReminders,
  useUpdateReminder,
} from '@/core/application/hooks/use-reminders';
import { type Reminder } from '@/core/domain/entities/reminder';

import { ConfirmDialog } from '@/presentation/components/feedback/ConfirmDialog';

import { getTodayLocaleDate } from '@/lib/format';
import { canUsePip, openPipWindow, PIP_LIST_SIZE } from '@/lib/pip-window';
import { compareReminders } from '@/lib/reminder-status';

import { ReminderForm } from './ReminderForm';
import { ReminderItem } from './ReminderItem';

export function RemindersList() {
  const t = useTranslations('reminders');
  const tCommon = useTranslations('common');
  const tPip = useTranslations('pip');
  const locale = useLocale();

  const { data: reminders, isLoading } = useReminders();
  const updateMutation = useUpdateReminder();
  const deleteMutation = useDeleteReminder();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [deleting, setDeleting] = useState<Reminder | null>(null);
  // Read once: whether this is the desktop shell cannot change mid-session.
  const [pipAvailable] = useState(canUsePip);

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

  // One window for the whole list, not one per reminder: a reminder is a line
  // with a checkbox, so five windows would be five ways to read five lines.
  async function handleOpenPip() {
    const opened = await openPipWindow({ module: 'reminders', locale, size: PIP_LIST_SIZE });
    if (!opened) toast.error(tPip('unavailable'));
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
        <div className="flex items-center gap-2">
          {pipAvailable && (
            <button
              type="button"
              onClick={() => void handleOpenPip()}
              aria-label={tPip('open')}
              title={tPip('open')}
              className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <PictureInPicture2 className="size-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" />
            {t('createReminder')}
          </button>
        </div>
      </div>

      {ordered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <Bell className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">{t('emptyState')}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {ordered.map((reminder) => (
            <ReminderItem
              key={reminder.id}
              reminder={reminder}
              onToggle={handleToggle}
              onEdit={handleEdit}
              onDelete={setDeleting}
            />
          ))}
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
