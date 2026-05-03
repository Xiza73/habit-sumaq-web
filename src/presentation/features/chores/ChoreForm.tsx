'use client';

import { useEffect, useId, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod/v4';

import { useCreateChore, useUpdateChore } from '@/core/application/hooks/use-chores';
import { type Chore, CHORE_INTERVAL_UNITS } from '@/core/domain/entities/chore';
import { type CreateChoreInput, type UpdateChoreInput } from '@/core/domain/schemas/chore.schema';

import { ApiError } from '@/infrastructure/api/api-error';

import { DatePicker } from '@/presentation/components/ui/DatePicker';
import { Input } from '@/presentation/components/ui/Input';
import { Modal } from '@/presentation/components/ui/Modal';
import { Select } from '@/presentation/components/ui/Select';

import { getTodayLocaleDate } from '@/lib/format';

interface ChoreFormProps {
  open: boolean;
  chore?: Chore | null;
  /**
   * Categories already used by the user — fed to a `<datalist>` so the
   * input behaves as a free-text field with autocomplete suggestions
   * instead of forcing a select.
   */
  knownCategories: string[];
  onClose: () => void;
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

// One unified form schema covers both create and edit. The component then
// shows / hides fields based on `isEditing` — fields hidden in edit mode
// (e.g. `intervalValue`, `intervalUnit`, `startDate`) are kept in the form
// state but ignored on submit, so the resolver can stay statically typed.
const FORM_DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const formSchema = z.object({
  name: z.string().trim().min(1, 'required').max(100, 'max_length'),
  intervalValue: z.number().int().min(1, 'min_interval'),
  intervalUnit: z.enum([...CHORE_INTERVAL_UNITS] as [string, ...string[]], {
    message: 'invalid_interval_unit',
  }),
  startDate: z.string().regex(FORM_DATE_REGEX, 'invalid_date'),
  // Edit-only — empty string accepted to keep the controlled input happy.
  nextDueDate: z
    .string()
    .refine((v) => v === '' || FORM_DATE_REGEX.test(v), { message: 'invalid_date' })
    .optional(),
  category: z.string().max(50, 'max_length'),
  notes: z.string().max(1000, 'max_length'),
});
type FormValues = z.infer<typeof formSchema>;

export function ChoreForm({ open, chore, knownCategories, onClose }: ChoreFormProps) {
  const t = useTranslations('chores');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const isEditing = !!chore;

  const datalistId = useId();

  const createMutation = useCreateChore();
  const updateMutation = useUpdateChore();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const defaultValues = useMemo<FormValues>(
    () => ({
      name: '',
      intervalValue: 1,
      intervalUnit: 'months',
      startDate: getTodayLocaleDate(),
      nextDueDate: '',
      category: '',
      notes: '',
    }),
    [],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!open) return;

    if (chore) {
      form.reset({
        name: chore.name,
        intervalValue: chore.intervalValue,
        intervalUnit: chore.intervalUnit,
        startDate: chore.startDate,
        nextDueDate: chore.nextDueDate,
        category: chore.category ?? '',
        notes: chore.notes ?? '',
      });
    } else {
      form.reset(defaultValues);
    }
  }, [open, chore, form, defaultValues]);

  function handleSubmit(values: FormValues) {
    if (isEditing && chore) {
      const updateData: UpdateChoreInput = {
        name: values.name.trim(),
        // Send `null` to the backend when the field was cleared so the column
        // is wiped instead of left untouched.
        notes: emptyToNull(values.notes),
        category: emptyToNull(values.category),
        nextDueDate: values.nextDueDate || undefined,
      };
      updateMutation.mutate(
        { id: chore.id, data: updateData },
        {
          onSuccess: () => {
            toast.success(t('editChore'));
            onClose();
          },
          onError: handleError,
        },
      );
    } else {
      const createData: CreateChoreInput = {
        name: values.name.trim(),
        intervalValue: values.intervalValue,
        // The form schema widens this to `string`; the runtime value is one
        // of `CHORE_INTERVAL_UNITS` because we render only those options.
        intervalUnit: values.intervalUnit,
        startDate: values.startDate,
        notes: emptyToNull(values.notes),
        category: emptyToNull(values.category),
      };
      createMutation.mutate(createData, {
        onSuccess: () => {
          toast.success(t('createChore'));
          onClose();
        },
        onError: handleError,
      });
    }
  }

  function handleError(error: Error) {
    toast.error(
      error instanceof ApiError && error.code && tErrors.has(error.code)
        ? tErrors(error.code as 'CHRE_001')
        : tErrors('generic'),
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? t('editChore') : t('createChore')}>
      <form onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="chore-name" className="text-sm font-medium">
            {t('fields.name')}
          </label>
          <Input
            id="chore-name"
            type="text"
            {...form.register('name')}
            placeholder={t('fields.name')}
          />
          {form.formState.errors.name && (
            <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>

        {!isEditing && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="chore-interval-value" className="text-sm font-medium">
                {t('fields.intervalValue')}
              </label>
              <Input
                id="chore-interval-value"
                type="number"
                min="1"
                step="1"
                {...form.register('intervalValue', { valueAsNumber: true })}
              />
              {form.formState.errors.intervalValue && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.intervalValue.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="chore-interval-unit" className="text-sm font-medium">
                {t('fields.intervalUnit')}
              </label>
              <Select id="chore-interval-unit" {...form.register('intervalUnit')}>
                {CHORE_INTERVAL_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {/* Pluralized in i18n via the form value (`value: 2` to
                        force the `other` branch on the select label). */}
                    {t(`intervalUnit.${unit}`, { value: 2 })}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}

        {!isEditing && (
          <div className="space-y-2">
            <label htmlFor="chore-start-date" className="text-sm font-medium">
              {t('fields.startDate')}
            </label>
            <Controller
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <DatePicker id="chore-start-date" value={field.value} onChange={field.onChange} />
              )}
            />
            {form.formState.errors.startDate && (
              <p className="text-xs text-destructive">{form.formState.errors.startDate.message}</p>
            )}
          </div>
        )}

        {isEditing && (
          <div className="space-y-2">
            <label htmlFor="chore-next-due" className="text-sm font-medium">
              {t('fields.nextDueDate')}
            </label>
            <Controller
              control={form.control}
              name="nextDueDate"
              render={({ field }) => (
                <DatePicker
                  id="chore-next-due"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              )}
            />
            <p className="text-[11px] text-muted-foreground">{t('fields.nextDueDateHint')}</p>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="chore-category" className="text-sm font-medium">
            {t('fields.category')}
          </label>
          <Input
            id="chore-category"
            type="text"
            list={datalistId}
            {...form.register('category')}
            placeholder={t('fields.category')}
          />
          <datalist id={datalistId}>
            {knownCategories.map((cat) => (
              <option key={cat} value={cat} />
            ))}
          </datalist>
          <p className="text-[11px] text-muted-foreground">{t('fields.categoryHint')}</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="chore-notes" className="text-sm font-medium">
            {t('fields.notes')}
          </label>
          <textarea
            id="chore-notes"
            rows={3}
            {...form.register('notes')}
            placeholder={t('fields.notesPlaceholder')}
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
            disabled={isPending}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isEditing ? tCommon('save') : tCommon('create')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
