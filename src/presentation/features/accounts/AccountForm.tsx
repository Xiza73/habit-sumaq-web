'use client';

import { useEffect } from 'react';
import { type Control, useForm, useWatch } from 'react-hook-form';
import { useTranslations } from 'next-intl';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, X } from 'lucide-react';

import { useCreateAccount, useUpdateAccount } from '@/core/application/hooks/use-accounts';
import { type Account } from '@/core/domain/entities/account';
import {
  type CreateAccountInput,
  createAccountSchema,
  type UpdateAccountInput,
} from '@/core/domain/schemas/account.schema';

import { ApiError } from '@/infrastructure/api/api-error';

function ColorPreview({ control }: { control: Control<CreateAccountInput> }) {
  const color = useWatch({ control, name: 'color' });
  return <span className="text-sm text-muted-foreground">{color}</span>;
}

interface AccountFormProps {
  open: boolean;
  account?: Account | null;
  onClose: () => void;
}

export function AccountForm({ open, account, onClose }: AccountFormProps) {
  const t = useTranslations('accounts');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const isEditing = !!account;

  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<CreateAccountInput>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      name: '',
      type: 'checking',
      currency: 'PEN',
      initialBalance: 0,
      color: '#4CAF50',
      icon: null,
    },
  });

  useEffect(() => {
    if (account) {
      form.reset({
        name: account.name,
        type: account.type,
        currency: account.currency,
        initialBalance: 0,
        color: account.color ?? '#4CAF50',
        icon: account.icon,
      });
    } else {
      form.reset({
        name: '',
        type: 'checking',
        currency: 'PEN',
        initialBalance: 0,
        color: '#4CAF50',
        icon: null,
      });
    }
  }, [account, form]);

  function handleSubmit(values: CreateAccountInput) {
    if (isEditing && account) {
      const updateData: UpdateAccountInput = {
        name: values.name,
        color: values.color,
        icon: values.icon,
      };
      updateMutation.mutate(
        { id: account.id, data: updateData },
        {
          onSuccess: () => onClose(),
          onError: handleError,
        },
      );
    } else {
      createMutation.mutate(values, {
        onSuccess: () => onClose(),
        onError: handleError,
      });
    }
  }

  function handleError(error: Error) {
    if (error instanceof ApiError && error.code === 'ACC_002') {
      form.setError('name', { message: tErrors('ACC_002') });
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
        role="button"
        tabIndex={0}
        aria-label="Close dialog"
      />
      <div className="relative z-50 w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isEditing ? t('editAccount') : t('createAccount')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              {t('name')}
            </label>
            <input
              id="name"
              type="text"
              {...form.register('name')}
              className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder={t('name')}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="type" className="text-sm font-medium">
                {t('type')}
              </label>
              <select
                id="type"
                {...form.register('type')}
                disabled={isEditing}
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="checking">{t('types.checking')}</option>
                <option value="savings">{t('types.savings')}</option>
                <option value="cash">{t('types.cash')}</option>
                <option value="credit_card">{t('types.credit_card')}</option>
                <option value="investment">{t('types.investment')}</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="currency" className="text-sm font-medium">
                {t('currency')}
              </label>
              <select
                id="currency"
                {...form.register('currency')}
                disabled={isEditing}
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="PEN">{t('currencies.PEN')}</option>
                <option value="USD">{t('currencies.USD')}</option>
                <option value="EUR">{t('currencies.EUR')}</option>
              </select>
            </div>
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <label htmlFor="initialBalance" className="text-sm font-medium">
                {t('initialBalance')}
              </label>
              <input
                id="initialBalance"
                type="number"
                step="0.01"
                min="0"
                {...form.register('initialBalance', { valueAsNumber: true })}
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          )}

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
              <ColorPreview control={form.control} />
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
      </div>
    </div>
  );
}
