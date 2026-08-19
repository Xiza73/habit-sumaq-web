'use client';

import { useForm, useWatch } from 'react-hook-form';
import { useTranslations } from 'next-intl';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useCreateReminder, useUpdateReminder } from '@/core/application/hooks/use-reminders';
import { type Reminder } from '@/core/domain/entities/reminder';
import {
  type CreateReminderInput,
  createReminderSchema,
} from '@/core/domain/schemas/reminder.schema';

import { ApiError } from '@/infrastructure/api/api-error';

import { Input } from '@/presentation/components/ui/Input';
import { Modal } from '@/presentation/components/ui/Modal';

interface ReminderFormProps {
  open: boolean;
  reminder?: Reminder | null;
  onClose: () => void;
}

/**
 * Body is a separate component so `defaultValues` come straight from the
 * `reminder` prop — no `useEffect(() => form.reset(...))`. Modal returns null
 * when closed, so each open mounts a fresh Body. Same pattern as
 * `QuickTaskForm`.
 */
export function ReminderForm({ open, reminder, onClose }: ReminderFormProps) {
  if (!open) return null;
  return <Body reminder={reminder ?? null} onClose={onClose} />;
}

function Body({ reminder, onClose }: { reminder: Reminder | null; onClose: () => void }) {
  const t = useTranslations('reminders');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const isEditing = !!reminder;

  const createMutation = useCreateReminder();
  const updateMutation = useUpdateReminder();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<CreateReminderInput>({
    resolver: zodResolver(createReminderSchema),
    defaultValues: {
      title: reminder?.title ?? '',
      notes: reminder?.notes ?? '',
      remindDate: reminder?.remindDate ?? '',
      remindTime: reminder?.remindTime ?? '',
    },
  });

  // The time field is disabled without a date rather than hidden: hiding it
  // would make the rule invisible, and the user would keep wondering where
  // the hour went.
  const remindDate = useWatch({ control: form.control, name: 'remindDate' });
  const hasDate = !!remindDate;

  function onSubmit(values: CreateReminderInput) {
    const payload: CreateReminderInput = {
      ...values,
      notes: values.notes ? values.notes : null,
      remindDate: values.remindDate ? values.remindDate : null,
      // Clearing the date clears the hour with it — the backend refuses the
      // orphaned combination, and silently dropping it here is friendlier
      // than surfacing RMDR_008 for something the user did not type.
      remindTime: values.remindDate && values.remindTime ? values.remindTime : null,
    };

    const onError = (error: unknown) => {
      if (error instanceof ApiError && error.code && tErrors.has(error.code)) {
        toast.error(tErrors(error.code as 'RMDR_001'));
      } else {
        toast.error(tErrors('generic'));
      }
    };

    if (isEditing) {
      updateMutation.mutate({ id: reminder.id, data: payload }, { onSuccess: onClose, onError });
    } else {
      createMutation.mutate(payload, { onSuccess: onClose, onError });
    }
  }

  return (
    <Modal open onClose={onClose} title={isEditing ? t('editReminder') : t('createReminder')}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="reminder-title" className="text-sm font-medium">
            {t('titleLabel')}
          </label>
          <Input
            id="reminder-title"
            type="text"
            placeholder={t('titlePlaceholder')}
            maxLength={120}
            {...form.register('title')}
          />
          {form.formState.errors.title && (
            <p className="text-xs text-destructive">{tCommon('required')}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="reminder-date" className="text-sm font-medium">
              {t('dateLabel')}
            </label>
            <Input id="reminder-date" type="date" {...form.register('remindDate')} />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reminder-time" className="text-sm font-medium">
              {t('timeLabel')}
            </label>
            <Input
              id="reminder-time"
              type="time"
              disabled={!hasDate}
              {...form.register('remindTime')}
            />
            {!hasDate && <p className="text-xs text-muted-foreground">{t('timeNeedsDate')}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="reminder-notes" className="text-sm font-medium">
            {t('notesLabel')}
          </label>
          <textarea
            id="reminder-notes"
            rows={4}
            placeholder={t('notesPlaceholder')}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            {...form.register('notes')}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            {tCommon('cancel')}
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {tCommon('save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
