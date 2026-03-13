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
  useCreateTransaction,
  useUpdateTransaction,
} from '@/core/application/hooks/use-transactions';
import { type Transaction } from '@/core/domain/entities/transaction';
import {
  type CreateTransactionInput,
  createTransactionSchema,
  type UpdateTransactionInput,
} from '@/core/domain/schemas/transaction.schema';

import { ApiError } from '@/infrastructure/api/api-error';

import { Modal } from '@/presentation/components/ui/Modal';

interface TransactionFormProps {
  open: boolean;
  transaction?: Transaction | null;
  defaultAccountId?: string;
  onClose: () => void;
}

export function TransactionForm({
  open,
  transaction,
  defaultAccountId,
  onClose,
}: TransactionFormProps) {
  const t = useTranslations('transactions');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const isEditing = !!transaction;

  const { data: accounts } = useAccounts(false);
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const today = new Date().toISOString().split('T')[0];

  const form = useForm<CreateTransactionInput>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      accountId: defaultAccountId ?? '',
      categoryId: null,
      type: 'EXPENSE',
      amount: 0,
      description: null,
      date: today,
      destinationAccountId: null,
      reference: null,
    },
  });

  const selectedType = useWatch({ control: form.control, name: 'type' });
  const selectedAccountId = useWatch({ control: form.control, name: 'accountId' });

  const selectedAccount = accounts?.find((a) => a.id === selectedAccountId);
  const categoryType = selectedType === 'INCOME' ? 'INCOME' : 'EXPENSE';
  const { data: categories } = useCategories(categoryType);

  const showDestination = selectedType === 'TRANSFER';
  const showReference = selectedType === 'DEBT' || selectedType === 'LOAN';

  const destinationAccounts = accounts?.filter((a) => {
    if (a.id === selectedAccountId) return false;
    if (!selectedAccount) return true;
    return a.currency === selectedAccount.currency;
  });

  useEffect(() => {
    if (!open) return;

    if (transaction) {
      form.reset({
        accountId: transaction.accountId,
        categoryId: transaction.categoryId,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        date: transaction.date.split('T')[0],
        destinationAccountId: transaction.destinationAccountId,
        reference: transaction.reference,
      });
    } else {
      form.reset({
        accountId: defaultAccountId ?? '',
        categoryId: null,
        type: 'EXPENSE',
        amount: 0,
        description: null,
        date: today,
        destinationAccountId: null,
        reference: null,
      });
    }
  }, [open, transaction, defaultAccountId, form, today]);

  function handleSubmit(values: CreateTransactionInput) {
    if (isEditing && transaction) {
      const updateData: UpdateTransactionInput = {
        categoryId: values.categoryId,
        amount: values.amount,
        description: values.description,
        date: values.date,
        reference: values.reference,
      };
      updateMutation.mutate(
        { id: transaction.id, data: updateData },
        {
          onSuccess: () => {
            toast.success(t('editTransaction'));
            onClose();
          },
          onError: handleError,
        },
      );
    } else {
      createMutation.mutate(values, {
        onSuccess: () => {
          toast.success(t('createTransaction'));
          onClose();
        },
        onError: handleError,
      });
    }
  }

  function handleError(error: Error) {
    if (error instanceof ApiError && error.code) {
      const knownCodes = [
        'TXN_003',
        'TXN_004',
        'TXN_005',
        'TXN_006',
        'TXN_007',
        'TXN_008',
        'TXN_011',
      ];
      if (knownCodes.includes(error.code)) {
        toast.error(tErrors(error.code as 'TXN_003'));
      } else {
        toast.error(tErrors('generic'));
      }
    } else {
      toast.error(tErrors('generic'));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? t('editTransaction') : t('createTransaction')}
    >
      <form onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="txn-type" className="text-sm font-medium">
            {t('type')}
          </label>
          <select
            id="txn-type"
            {...form.register('type')}
            disabled={isEditing}
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="EXPENSE">{t('types.EXPENSE')}</option>
            <option value="INCOME">{t('types.INCOME')}</option>
            <option value="TRANSFER">{t('types.TRANSFER')}</option>
            <option value="DEBT">{t('types.DEBT')}</option>
            <option value="LOAN">{t('types.LOAN')}</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="txn-amount" className="text-sm font-medium">
              {t('amount')}
            </label>
            <input
              id="txn-amount"
              type="number"
              step="0.01"
              min="0.01"
              {...form.register('amount', { valueAsNumber: true })}
              className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {form.formState.errors.amount && (
              <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="txn-date" className="text-sm font-medium">
              {t('date')}
            </label>
            <input
              id="txn-date"
              type="date"
              {...form.register('date')}
              className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="txn-account" className="text-sm font-medium">
            {t('account')}
          </label>
          <select
            id="txn-account"
            {...form.register('accountId')}
            disabled={isEditing}
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">{t('allAccounts')}</option>
            {accounts
              ?.filter((a) => !a.isArchived)
              .map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.currency})
                </option>
              ))}
          </select>
          {form.formState.errors.accountId && (
            <p className="text-xs text-destructive">{form.formState.errors.accountId.message}</p>
          )}
        </div>

        {showDestination && (
          <div className="space-y-2">
            <label htmlFor="txn-dest" className="text-sm font-medium">
              {t('destinationAccount')}
            </label>
            <select
              id="txn-dest"
              {...form.register('destinationAccountId')}
              disabled={isEditing}
              className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">{t('allAccounts')}</option>
              {destinationAccounts
                ?.filter((a) => !a.isArchived)
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.currency})
                  </option>
                ))}
            </select>
            {form.formState.errors.destinationAccountId && (
              <p className="text-xs text-destructive">
                {form.formState.errors.destinationAccountId.message}
              </p>
            )}
          </div>
        )}

        {!isEditing && (selectedType === 'INCOME' || selectedType === 'EXPENSE') && (
          <div className="space-y-2">
            <label htmlFor="txn-category" className="text-sm font-medium">
              {t('category')}
            </label>
            <select
              id="txn-category"
              {...form.register('categoryId')}
              className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">{t('allCategories')}</option>
              {categories?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {isEditing && (selectedType === 'INCOME' || selectedType === 'EXPENSE') && (
          <div className="space-y-2">
            <label htmlFor="txn-category-edit" className="text-sm font-medium">
              {t('category')}
            </label>
            <select
              id="txn-category-edit"
              {...form.register('categoryId')}
              className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">{t('allCategories')}</option>
              {categories?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {showReference && (
          <div className="space-y-2">
            <label htmlFor="txn-reference" className="text-sm font-medium">
              {t('reference')}
            </label>
            <input
              id="txn-reference"
              type="text"
              {...form.register('reference')}
              className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder={t('reference')}
            />
            {form.formState.errors.reference && (
              <p className="text-xs text-destructive">{form.formState.errors.reference.message}</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="txn-description" className="text-sm font-medium">
            {t('description')}
          </label>
          <input
            id="txn-description"
            type="text"
            {...form.register('description')}
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder={t('description')}
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
