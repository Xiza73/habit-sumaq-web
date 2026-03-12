'use client';

import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAccounts } from '@/core/application/hooks/use-accounts';
import { useSettleTransaction } from '@/core/application/hooks/use-transactions';
import { type Transaction } from '@/core/domain/entities/transaction';
import { type Currency } from '@/core/domain/enums/account.enums';
import {
  type SettleTransactionInput,
  settleTransactionSchema,
} from '@/core/domain/schemas/transaction.schema';

import { ApiError } from '@/infrastructure/api/api-error';

import { Modal } from '@/presentation/components/ui/Modal';

import { formatCurrency } from '@/lib/format';

interface SettleFormProps {
  open: boolean;
  transaction: Transaction | null;
  currency: Currency;
  onClose: () => void;
}

export function SettleForm({ open, transaction, currency, onClose }: SettleFormProps) {
  const t = useTranslations('transactions');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const { data: accounts } = useAccounts(false);
  const settleMutation = useSettleTransaction();

  const today = new Date().toISOString().split('T')[0];

  const form = useForm<SettleTransactionInput>({
    resolver: zodResolver(settleTransactionSchema),
    defaultValues: {
      accountId: '',
      amount: transaction?.remainingAmount ?? 0,
      description: null,
      date: today,
    },
  });

  const title = transaction?.type === 'DEBT' ? t('settleDebt') : t('settleLoan');

  function handleSubmit(values: SettleTransactionInput) {
    if (!transaction) return;
    settleMutation.mutate(
      { id: transaction.id, data: values },
      {
        onSuccess: () => {
          toast.success(t('settle'));
          onClose();
        },
        onError: (error) => {
          if (error instanceof ApiError && error.code) {
            const knownCodes = ['TXN_010', 'TXN_012'];
            if (knownCodes.includes(error.code)) {
              toast.error(tErrors(error.code as 'TXN_010'));
            } else {
              toast.error(tErrors('generic'));
            }
          } else {
            toast.error(tErrors('generic'));
          }
        },
      },
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {transaction && (
        <div className="mb-4 rounded-lg bg-muted p-3 text-sm">
          <p className="font-medium">{transaction.reference}</p>
          <p className="text-muted-foreground">
            {t('remaining')}:{' '}
            <span className="font-semibold">
              {formatCurrency(transaction.remainingAmount ?? 0, currency)}
            </span>
          </p>
        </div>
      )}

      <form onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="settle-account" className="text-sm font-medium">
            {t('settleAccount')}
          </label>
          <select
            id="settle-account"
            {...form.register('accountId')}
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="settle-amount" className="text-sm font-medium">
              {t('settleAmount')}
            </label>
            <input
              id="settle-amount"
              type="number"
              step="0.01"
              min="0.01"
              max={transaction?.remainingAmount ?? undefined}
              {...form.register('amount', { valueAsNumber: true })}
              className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {form.formState.errors.amount && (
              <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="settle-date" className="text-sm font-medium">
              {t('date')}
            </label>
            <input
              id="settle-date"
              type="date"
              {...form.register('date')}
              className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="settle-description" className="text-sm font-medium">
            {t('description')}
          </label>
          <input
            id="settle-description"
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
            disabled={settleMutation.isPending}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {settleMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t('settle')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
