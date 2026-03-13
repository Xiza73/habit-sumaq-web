'use client';

import { useEffect } from 'react';
import { type Control, useForm, useWatch } from 'react-hook-form';
import { useTranslations } from 'next-intl';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useCreateAccount, useUpdateAccount } from '@/core/application/hooks/use-accounts';
import { type Account } from '@/core/domain/entities/account';
import {
  type CreateAccountInput,
  createAccountSchema,
  type UpdateAccountInput,
} from '@/core/domain/schemas/account.schema';

import { ApiError } from '@/infrastructure/api/api-error';

import { Input } from '@/presentation/components/ui/Input';
import { Modal } from '@/presentation/components/ui/Modal';
import { Select } from '@/presentation/components/ui/Select';

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
    if (!open) return;

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
  }, [open, account, form]);

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
          onSuccess: () => {
            toast.success(t('editAccount'));
            onClose();
          },
          onError: handleError,
        },
      );
    } else {
      createMutation.mutate(values, {
        onSuccess: () => {
          toast.success(t('createAccount'));
          onClose();
        },
        onError: handleError,
      });
    }
  }

  function handleError(error: Error) {
    if (error instanceof ApiError && error.code === 'ACC_002') {
      form.setError('name', { message: tErrors('ACC_002') });
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? t('editAccount') : t('createAccount')}>
      <form onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            {t('name')}
          </label>
          <Input
            id="name"
            type="text"
            {...form.register('name')}
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
            <Select id="type" {...form.register('type')} disabled={isEditing}>
              <option value="checking">{t('types.checking')}</option>
              <option value="savings">{t('types.savings')}</option>
              <option value="cash">{t('types.cash')}</option>
              <option value="credit_card">{t('types.credit_card')}</option>
              <option value="investment">{t('types.investment')}</option>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="currency" className="text-sm font-medium">
              {t('currency')}
            </label>
            <Select id="currency" {...form.register('currency')} disabled={isEditing}>
              <option value="PEN">{t('currencies.PEN')}</option>
              <option value="USD">{t('currencies.USD')}</option>
              <option value="EUR">{t('currencies.EUR')}</option>
            </Select>
          </div>
        </div>

        {!isEditing && (
          <div className="space-y-2">
            <label htmlFor="initialBalance" className="text-sm font-medium">
              {t('initialBalance')}
            </label>
            <Input
              id="initialBalance"
              type="number"
              step="0.01"
              min="0"
              {...form.register('initialBalance', { valueAsNumber: true })}
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
    </Modal>
  );
}
