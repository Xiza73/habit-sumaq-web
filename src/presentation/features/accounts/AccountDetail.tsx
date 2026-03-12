'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { ArrowLeft, Loader2 } from 'lucide-react';

import {
  useAccount,
  useArchiveAccount,
  useDeleteAccount,
} from '@/core/application/hooks/use-accounts';

import { ApiError } from '@/infrastructure/api/api-error';

import { ConfirmDialog } from '@/presentation/components/feedback/ConfirmDialog';

import { ACCOUNT_TYPE_ICONS } from '@/lib/account-icons';
import { formatCurrency } from '@/lib/format';

import { AccountForm } from './AccountForm';

interface AccountDetailProps {
  accountId: string;
}

export function AccountDetail({ accountId }: AccountDetailProps) {
  const router = useRouter();
  const t = useTranslations('accounts');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');

  const { data: account, isLoading } = useAccount(accountId);
  const archiveMutation = useArchiveAccount();
  const deleteMutation = useDeleteAccount();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleDelete() {
    setDeleteError(null);
    deleteMutation.mutate(accountId, {
      onSuccess: () => router.replace('/accounts'),
      onError: (error) => {
        if (error instanceof ApiError && error.code === 'ACC_003') {
          setDeleteError(tErrors('ACC_003'));
        } else {
          setDeleteError(tErrors('generic'));
        }
      },
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!account) {
    return <div className="py-12 text-center text-muted-foreground">{tErrors('ACC_001')}</div>;
  }

  const Icon = ACCOUNT_TYPE_ICONS[account.type];
  const isNegative = account.balance < 0;

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {tCommon('back')}
      </button>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex size-14 items-center justify-center rounded-xl"
              style={{ backgroundColor: account.color ? `${account.color}20` : undefined }}
            >
              <Icon className="size-7" style={{ color: account.color ?? undefined }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{account.name}</h1>
              <p className="text-sm text-muted-foreground">
                {t(`types.${account.type}`)} · {account.currency}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              {tCommon('edit')}
            </button>
            <button
              type="button"
              onClick={() => archiveMutation.mutate(accountId)}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              {account.isArchived ? tCommon('unarchive') : tCommon('archive')}
            </button>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="rounded-md border border-destructive px-3 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              {tCommon('delete')}
            </button>
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-6">
          <p className="text-sm text-muted-foreground">{t('balance')}</p>
          <p
            className={`text-3xl font-bold tabular-nums ${isNegative ? 'text-expense' : 'text-foreground'}`}
          >
            {formatCurrency(account.balance, account.currency)}
          </p>
        </div>
      </div>

      <AccountForm open={editOpen} account={account} onClose={() => setEditOpen(false)} />

      <ConfirmDialog
        open={deleteOpen}
        title={t('deleteAccount')}
        description={deleteError ?? t('deleteConfirm')}
        variant="destructive"
        confirmLabel={t('deleteAccount')}
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteOpen(false);
          setDeleteError(null);
        }}
      />
    </div>
  );
}
