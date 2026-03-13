'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useCreateHabit, useUpdateHabit } from '@/core/application/hooks/use-habits';
import { type Habit } from '@/core/domain/entities/habit';
import {
  type CreateHabitInput,
  createHabitSchema,
  type UpdateHabitInput,
} from '@/core/domain/schemas/habit.schema';

import { ApiError } from '@/infrastructure/api/api-error';

import { Input } from '@/presentation/components/ui/Input';
import { Modal } from '@/presentation/components/ui/Modal';
import { Select } from '@/presentation/components/ui/Select';

interface HabitFormProps {
  open: boolean;
  habit?: Habit | null;
  onClose: () => void;
}

export function HabitForm({ open, habit, onClose }: HabitFormProps) {
  const t = useTranslations('habits');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const isEditing = !!habit;

  const createMutation = useCreateHabit();
  const updateMutation = useUpdateHabit();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<CreateHabitInput>({
    resolver: zodResolver(createHabitSchema),
    defaultValues: {
      name: '',
      description: null,
      frequency: 'DAILY',
      targetCount: 1,
      color: '#2196F3',
      icon: null,
    },
  });

  useEffect(() => {
    if (!open) return;

    if (habit) {
      form.reset({
        name: habit.name,
        description: habit.description,
        frequency: habit.frequency,
        targetCount: habit.targetCount,
        color: habit.color ?? '#2196F3',
        icon: habit.icon,
      });
    } else {
      form.reset({
        name: '',
        description: null,
        frequency: 'DAILY',
        targetCount: 1,
        color: '#2196F3',
        icon: null,
      });
    }
  }, [open, habit, form]);

  function handleSubmit(values: CreateHabitInput) {
    if (isEditing && habit) {
      const updateData: UpdateHabitInput = {
        name: values.name,
        description: values.description,
        frequency: values.frequency,
        targetCount: values.targetCount,
        color: values.color,
        icon: values.icon,
      };
      updateMutation.mutate(
        { id: habit.id, data: updateData },
        {
          onSuccess: () => {
            toast.success(t('editHabit'));
            onClose();
          },
          onError: handleError,
        },
      );
    } else {
      createMutation.mutate(values, {
        onSuccess: () => {
          toast.success(t('createHabit'));
          onClose();
        },
        onError: handleError,
      });
    }
  }

  function handleError(error: Error) {
    if (error instanceof ApiError && error.code === 'HAB_002') {
      form.setError('name', { message: tErrors('HAB_002') });
    } else {
      toast.error(
        error instanceof ApiError && error.code && tErrors.has(error.code)
          ? tErrors(error.code as 'HAB_002')
          : tErrors('generic'),
      );
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? t('editHabit') : t('createHabit')}>
      <form onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            {t('name')}
          </label>
          <Input id="name" type="text" {...form.register('name')} placeholder={t('name')} />
          {form.formState.errors.name && (
            <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">
            {t('description')}
          </label>
          <Input
            id="description"
            type="text"
            {...form.register('description')}
            placeholder={t('description')}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="frequency" className="text-sm font-medium">
              {t('frequency')}
            </label>
            <Select id="frequency" {...form.register('frequency')}>
              <option value="DAILY">{t('frequencies.DAILY')}</option>
              <option value="WEEKLY">{t('frequencies.WEEKLY')}</option>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="targetCount" className="text-sm font-medium">
              {t('targetCount')}
            </label>
            <Input
              id="targetCount"
              type="number"
              min="1"
              step="1"
              {...form.register('targetCount', { valueAsNumber: true })}
            />
            {form.formState.errors.targetCount && (
              <p className="text-xs text-destructive">
                {form.formState.errors.targetCount.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="color" className="text-sm font-medium">
            {t('color')}
          </label>
          <div className="flex items-center gap-3">
            <input
              id="color"
              type="color"
              {...form.register('color')}
              className="size-10 cursor-pointer rounded-md border border-border"
            />
          </div>
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
