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

import { Input } from '@/presentation/components/ui/Input';
import { Modal } from '@/presentation/components/ui/Modal';
import { Select } from '@/presentation/components/ui/Select';

import { getTodayLocaleDate } from '@/lib/format';

interface TransactionFormProps {
  open: boolean;
  transaction?: Transaction | null;
  defaultAccountId?: string;
  /**
   * When set, the type select is removed from the form and all new
   * transactions are created with this type. Used by the Debts dashboard
   * to offer "Nueva deuda" / "Nuevo préstamo" shortcuts without exposing
   * the full type picker.
   *
   * Ignored while editing — `transaction.type` is already immutable there.
   */
  lockedType?: 'DEBT' | 'LOAN';
  onClose: () => void;
}

export function TransactionForm({
  open,
  transaction,
  defaultAccountId,
  lockedType,
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

  const today = getTodayLocaleDate();

  const form = useForm<CreateTransactionInput>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      accountId: defaultAccountId ?? '',
      categoryId: null,
      type: lockedType ?? 'EXPENSE',
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
        type: lockedType ?? 'EXPENSE',
        amount: 0,
        description: null,
        date: today,
        destinationAccountId: null,
        reference: null,
      });
    }
  }, [open, transaction, defaultAccountId, lockedType, form, today]);

  function emptyToNull(value: string | null | undefined): string | null {
    return value === '' ? null : (value ?? null);
  }

  function handleSubmit(values: CreateTransactionInput) {
    const cleaned = {
      ...values,
      categoryId: emptyToNull(values.categoryId),
      description: emptyToNull(values.description),
      destinationAccountId: emptyToNull(values.destinationAccountId),
      reference: emptyToNull(values.reference),
    };

    if (isEditing && transaction) {
      const updateData: UpdateTransactionInput = {
        categoryId: cleaned.categoryId,
        amount: cleaned.amount,
        description: cleaned.description,
        date: cleaned.date,
        reference: cleaned.reference,
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
      createMutation.mutate(cleaned, {
        onSuccess: () => {
          toast.success(t('createTransaction'));
          onClose();
        },
        onError: handleError,
      });
    }
  }

  function handleError(error: Error) {
    if (error instanceof ApiError && error.code && tErrors.has(error.code)) {
      toast.error(tErrors(error.code as 'TXN_003'));
    } else {
      toast.error(tErrors('generic'));
    }
  }

  const createTitle =
    lockedType === 'DEBT'
      ? t('createDebt')
      : lockedType === 'LOAN'
        ? t('createLoan')
        : t('createTransaction');

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? t('editTransaction') : createTitle}>
      <form onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)} className="space-y-4">
        {lockedType && !isEditing ? (
          // Type is locked — keep it in the form state via a hidden input so
          // react-hook-form still submits it, but hide the whole field.
          <input type="hidden" {...form.register('type')} value={lockedType} />
        ) : (
          <div className="space-y-2">
            <label htmlFor="txn-type" className="text-sm font-medium">
              {t('type')}
            </label>
            <Select id="txn-type" {...form.register('type')} disabled={isEditing}>
              <option value="EXPENSE">{t('types.EXPENSE')}</option>
              <option value="INCOME">{t('types.INCOME')}</option>
              <option value="TRANSFER">{t('types.TRANSFER')}</option>
              <option value="DEBT">{t('types.DEBT')}</option>
              <option value="LOAN">{t('types.LOAN')}</option>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="txn-amount" className="text-sm font-medium">
              {t('amount')}
            </label>
            <Input
              id="txn-amount"
              type="number"
              step="0.01"
              min="0.01"
              {...form.register('amount', { valueAsNumber: true })}
            />
            {form.formState.errors.amount && (
              <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="txn-date" className="text-sm font-medium">
              {t('date')}
            </label>
            <Input id="txn-date" type="date" {...form.register('date')} />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="txn-account" className="text-sm font-medium">
            {t('account')}
          </label>
          <Select id="txn-account" {...form.register('accountId')} disabled={isEditing}>
            <option value="">{t('allAccounts')}</option>
            {accounts
              ?.filter((a) => !a.isArchived)
              .map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.currency})
                </option>
              ))}
          </Select>
          {form.formState.errors.accountId && (
            <p className="text-xs text-destructive">{form.formState.errors.accountId.message}</p>
          )}
        </div>

        {showDestination && (
          <div className="space-y-2">
            <label htmlFor="txn-dest" className="text-sm font-medium">
              {t('destinationAccount')}
            </label>
            <Select id="txn-dest" {...form.register('destinationAccountId')} disabled={isEditing}>
              <option value="">{t('allAccounts')}</option>
              {destinationAccounts
                ?.filter((a) => !a.isArchived)
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.currency})
                  </option>
                ))}
            </Select>
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
            <Select id="txn-category" {...form.register('categoryId')}>
              <option value="">{t('allCategories')}</option>
              {categories?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {isEditing && (selectedType === 'INCOME' || selectedType === 'EXPENSE') && (
          <div className="space-y-2">
            <label htmlFor="txn-category-edit" className="text-sm font-medium">
              {t('category')}
            </label>
            <Select id="txn-category-edit" {...form.register('categoryId')}>
              <option value="">{t('allCategories')}</option>
              {categories?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {showReference && (
          <div className="space-y-2">
            <label htmlFor="txn-reference" className="text-sm font-medium">
              {t('reference')}
            </label>
            <Input
              id="txn-reference"
              type="text"
              {...form.register('reference')}
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
          <Input
            id="txn-description"
            type="text"
            {...form.register('description')}
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
