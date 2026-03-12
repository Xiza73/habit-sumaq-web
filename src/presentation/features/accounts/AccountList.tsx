'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Eye, EyeOff, Plus } from 'lucide-react';
import { toast } from 'sonner';

import {
  useAccounts,
  useArchiveAccount,
  useDeleteAccount,
} from '@/core/application/hooks/use-accounts';
import { type Account } from '@/core/domain/entities/account';

import { ApiError } from '@/infrastructure/api/api-error';

import { ConfirmDialog } from '@/presentation/components/feedback/ConfirmDialog';

import { AccountCard } from './AccountCard';
import { AccountCardSkeleton } from './AccountCardSkeleton';
import { AccountForm } from './AccountForm';

export function AccountList() {
  const t = useTranslations('accounts');
  const tErrors = useTranslations('errors');

  const [showArchived, setShowArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: accounts, isLoading } = useAccounts(showArchived);
  const archiveMutation = useArchiveAccount();
  const deleteMutation = useDeleteAccount();

  function handleEdit(account: Account) {
    setEditingAccount(account);
    setFormOpen(true);
  }

  function handleCloseForm() {
    setFormOpen(false);
    setEditingAccount(null);
  }

  function handleArchive(account: Account) {
    archiveMutation.mutate(account.id, {
      onSuccess: (updated) => {
        toast.success(
          updated.isArchived
            ? t('archiveAccount')
            : t('unarchiveAccount', { defaultValue: 'Desarchivar' }),
        );
      },
    });
  }

  function handleDeleteConfirm() {
    if (!deletingAccount) return;
    setDeleteError(null);
    deleteMutation.mutate(deletingAccount.id, {
      onSuccess: () => {
        setDeletingAccount(null);
        toast.success(t('deleteAccount'));
      },
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="h-10 w-36 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AccountCardSkeleton />
          <AccountCardSkeleton />
          <AccountCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-muted"
            title={showArchived ? 'Hide archived' : 'Show archived'}
          >
            {showArchived ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingAccount(null);
              setFormOpen(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="size-4" />
            {t('createAccount')}
          </button>
        </div>
      </div>

      {!accounts?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <p className="max-w-xs text-muted-foreground">{t('emptyState')}</p>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="size-4" />
            {t('createAccount')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onEdit={handleEdit}
              onArchive={handleArchive}
              onDelete={setDeletingAccount}
            />
          ))}
        </div>
      )}

      <AccountForm open={formOpen} account={editingAccount} onClose={handleCloseForm} />

      <ConfirmDialog
        open={!!deletingAccount}
        title={t('deleteAccount')}
        description={deleteError ?? t('deleteConfirm')}
        variant="destructive"
        confirmLabel={t('deleteAccount')}
        loading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeletingAccount(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
}
