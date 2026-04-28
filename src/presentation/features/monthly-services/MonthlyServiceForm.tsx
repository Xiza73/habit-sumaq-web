'use client';

import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslations } from 'next-intl';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAccounts } from '@/core/application/hooks/use-accounts';
import { useCategories } from '@/core/application/hooks/use-categories';
import {
  useCreateMonthlyService,
  useUpdateMonthlyService,
} from '@/core/application/hooks/use-monthly-services';
import {
  MONTHLY_SERVICE_FREQUENCIES,
  MONTHLY_SERVICE_FREQUENCY_LABEL_KEYS,
  type MonthlyService,
} from '@/core/domain/entities/monthly-service';
import {
  type CreateMonthlyServiceInput,
  createMonthlyServiceSchema,
  type UpdateMonthlyServiceInput,
} from '@/core/domain/schemas/monthly-service.schema';

import { ApiError } from '@/infrastructure/api/api-error';

import { Input } from '@/presentation/components/ui/Input';
import { Modal } from '@/presentation/components/ui/Modal';
import { Select } from '@/presentation/components/ui/Select';

interface MonthlyServiceFormProps {
  open: boolean;
  service?: MonthlyService | null;
  onClose: () => void;
}

function emptyToUndefined<T extends string | number | null | undefined>(value: T): T | undefined {
  if (value === '' || value === null) return undefined;
  return value;
}

function getCurrentPeriod(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function MonthlyServiceForm({ open, service, onClose }: MonthlyServiceFormProps) {
  const t = useTranslations('monthlyServices');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const isEditing = !!service;

  const { data: accounts } = useAccounts(false);
  const { data: categories } = useCategories('EXPENSE');

  const createMutation = useCreateMonthlyService();
  const updateMutation = useUpdateMonthlyService();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<CreateMonthlyServiceInput>({
    resolver: zodResolver(createMonthlyServiceSchema),
    defaultValues: {
      name: '',
      defaultAccountId: '',
      categoryId: '',
      currency: 'PEN',
      frequencyMonths: 1,
      estimatedAmount: null,
      dueDay: null,
      startPeriod: getCurrentPeriod(),
    },
  });

  const selectedAccountId = useWatch({ control: form.control, name: 'defaultAccountId' });

  // In create mode the currency is locked to the selected account's currency.
  useEffect(() => {
    if (isEditing || !selectedAccountId) return;
    const account = accounts?.find((a) => a.id === selectedAccountId);
    if (account) form.setValue('currency', account.currency);
  }, [selectedAccountId, accounts, isEditing, form]);

  useEffect(() => {
    if (!open) return;

    if (service) {
      form.reset({
        name: service.name,
        defaultAccountId: service.defaultAccountId,
        categoryId: service.categoryId,
        currency: service.currency,
        frequencyMonths: service.frequencyMonths,
        estimatedAmount: service.estimatedAmount,
        dueDay: service.dueDay,
        startPeriod: service.startPeriod,
      });
    } else {
      form.reset({
        name: '',
        defaultAccountId: '',
        categoryId: '',
        currency: 'PEN',
        frequencyMonths: 1,
        estimatedAmount: null,
        dueDay: null,
        startPeriod: getCurrentPeriod(),
      });
    }
  }, [open, service, form]);

  function handleSubmit(values: CreateMonthlyServiceInput) {
    if (isEditing && service) {
      const updateData: UpdateMonthlyServiceInput = {
        name: values.name,
        defaultAccountId: values.defaultAccountId,
        categoryId: values.categoryId,
        estimatedAmount: emptyToUndefined(values.estimatedAmount) ?? null,
        dueDay: emptyToUndefined(values.dueDay) ?? null,
      };
      updateMutation.mutate(
        { id: service.id, data: updateData },
        {
          onSuccess: () => {
            toast.success(t('editService'));
            onClose();
          },
          onError: handleError,
        },
      );
    } else {
      const cleaned: CreateMonthlyServiceInput = {
        ...values,
        estimatedAmount: emptyToUndefined(values.estimatedAmount) ?? null,
        dueDay: emptyToUndefined(values.dueDay) ?? null,
      };
      createMutation.mutate(cleaned, {
        onSuccess: () => {
          toast.success(t('createService'));
          onClose();
        },
        onError: handleError,
      });
    }
  }

  function handleError(error: Error) {
    if (error instanceof ApiError && error.code === 'MSVC_003') {
      form.setError('name', { message: tErrors('MSVC_003') });
      return;
    }
    toast.error(
      error instanceof ApiError && error.code && tErrors.has(error.code)
        ? tErrors(error.code as 'MSVC_001')
        : tErrors('generic'),
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? t('editService') : t('createService')}>
      <form onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="msvc-name" className="text-sm font-medium">
            {t('fields.name')}
          </label>
          <Input
            id="msvc-name"
            type="text"
            {...form.register('name')}
            placeholder={t('fields.name')}
          />
          {form.formState.errors.name && (
            <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="msvc-account" className="text-sm font-medium">
            {t('fields.defaultAccount')}
          </label>
          <Select id="msvc-account" {...form.register('defaultAccountId')}>
            <option value="">—</option>
            {accounts
              ?.filter((a) => !a.isArchived)
              .map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.currency})
                </option>
              ))}
          </Select>
          {form.formState.errors.defaultAccountId && (
            <p className="text-xs text-destructive">
              {form.formState.errors.defaultAccountId.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="msvc-category" className="text-sm font-medium">
            {t('fields.category')}
          </label>
          <Select id="msvc-category" {...form.register('categoryId')}>
            <option value="">—</option>
            {categories?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          {form.formState.errors.categoryId && (
            <p className="text-xs text-destructive">{form.formState.errors.categoryId.message}</p>
          )}
        </div>

        {!isEditing && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="msvc-currency" className="text-sm font-medium">
                {t('fields.currency')}
              </label>
              <Select id="msvc-currency" {...form.register('currency')} disabled>
                <option value="PEN">PEN</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="msvc-start" className="text-sm font-medium">
                {t('fields.startPeriod')}
              </label>
              <Input
                id="msvc-start"
                type="month"
                {...form.register('startPeriod')}
                placeholder="2026-01"
              />
              {form.formState.errors.startPeriod && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.startPeriod.message}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="msvc-frequency" className="text-sm font-medium">
            {t('fields.frequency')}
          </label>
          <Select
            id="msvc-frequency"
            {...form.register('frequencyMonths', { valueAsNumber: true })}
            // Cadence is immutable after creation (matches the backend
            // contract). We still render the value in edit mode so the user
            // sees what they have.
            disabled={isEditing}
          >
            {MONTHLY_SERVICE_FREQUENCIES.map((value) => (
              <option key={value} value={value}>
                {t(`frequency.${MONTHLY_SERVICE_FREQUENCY_LABEL_KEYS[value]}`)}
              </option>
            ))}
          </Select>
          <p className="text-[11px] text-muted-foreground">
            {isEditing ? t('fields.frequencyHintEdit') : t('fields.frequencyHint')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="msvc-amount" className="text-sm font-medium">
              {t('fields.estimatedAmount')}
            </label>
            <Input
              id="msvc-amount"
              type="number"
              step="0.01"
              min="0"
              {...form.register('estimatedAmount', {
                setValueAs: (v) => (v === '' || v == null ? null : Number(v)),
              })}
            />
            <p className="text-[11px] text-muted-foreground">{t('fields.estimatedAmountHint')}</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="msvc-dueDay" className="text-sm font-medium">
              {t('fields.dueDay')}
            </label>
            <Input
              id="msvc-dueDay"
              type="number"
              min="1"
              max="31"
              step="1"
              {...form.register('dueDay', {
                setValueAs: (v) => (v === '' || v == null ? null : Number(v)),
              })}
            />
            {form.formState.errors.dueDay && (
              <p className="text-xs text-destructive">{t('fields.dueDayOutOfRange')}</p>
            )}
            <p className="text-[11px] text-muted-foreground">{t('fields.dueDayHint')}</p>
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
