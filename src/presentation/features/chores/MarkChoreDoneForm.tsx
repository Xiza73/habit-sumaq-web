'use client';

import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod/v4';

import { useMarkChoreDone } from '@/core/application/hooks/use-chores';
import { type Chore } from '@/core/domain/entities/chore';
import { type MarkChoreDoneInput } from '@/core/domain/schemas/chore.schema';

import { ApiError } from '@/infrastructure/api/api-error';

import { DatePicker } from '@/presentation/components/ui/DatePicker';
import { Modal } from '@/presentation/components/ui/Modal';

import { getTodayLocaleDate } from '@/lib/format';

interface MarkChoreDoneFormProps {
  open: boolean;
  chore: Chore | null;
  onClose: () => void;
}

// Form-level schema kept separate from the API schema because the form input
// for `note` is always a plain string (textarea) — the API schema accepts
// `null` for clearing. We downgrade `''` → `null` on submit.
const FORM_DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const formSchema = z.object({
  doneAt: z.string().regex(FORM_DATE_REGEX, 'invalid_date'),
  note: z.string().max(500, 'max_length'),
});
type FormValues = z.infer<typeof formSchema>;

export function MarkChoreDoneForm({ open, chore, onClose }: MarkChoreDoneFormProps) {
  const t = useTranslations('chores');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');

  const markDoneMutation = useMarkChoreDone();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { doneAt: getTodayLocaleDate(), note: '' },
  });

  useEffect(() => {
    if (!open || !chore) return;
    form.reset({
      doneAt: getTodayLocaleDate(),
      note: '',
    });
  }, [open, chore, form]);

  if (!chore) return null;

  function handleSubmit(values: FormValues) {
    if (!chore) return;

    const cleaned: MarkChoreDoneInput = {
      doneAt: values.doneAt || undefined,
      note: values.note.trim() === '' ? null : values.note.trim(),
    };

    markDoneMutation.mutate(
      { id: chore.id, data: cleaned },
      {
        onSuccess: () => {
          toast.success(t('doneForm.success', { name: chore.name }));
          onClose();
        },
        onError: (error) => {
          toast.error(
            error instanceof ApiError && error.code && tErrors.has(error.code)
              ? tErrors(error.code as 'CHRE_001')
              : tErrors('generic'),
          );
        },
      },
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={t('doneForm.title')}>
      <form onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)} className="space-y-4">
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          {t('doneForm.description', { name: chore.name })}
        </p>

        <div className="space-y-2">
          <label htmlFor="chore-done-at" className="text-sm font-medium">
            {t('doneForm.doneAt')}
          </label>
          <Controller
            control={form.control}
            name="doneAt"
            render={({ field }) => (
              <DatePicker id="chore-done-at" value={field.value} onChange={field.onChange} />
            )}
          />
          {form.formState.errors.doneAt && (
            <p className="text-xs text-destructive">{form.formState.errors.doneAt.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="chore-done-note" className="text-sm font-medium">
            {t('doneForm.note')}
          </label>
          <textarea
            id="chore-done-note"
            rows={3}
            {...form.register('note')}
            placeholder={t('doneForm.notePlaceholder')}
            className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            {tCommon('cancel')}
          </button>
          <button
            type="submit"
            disabled={markDoneMutation.isPending}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {markDoneMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t('doneForm.confirm')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
