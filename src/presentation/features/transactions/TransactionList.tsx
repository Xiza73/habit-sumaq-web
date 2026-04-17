'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Filter, HandCoins, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

import { useAccounts } from '@/core/application/hooks/use-accounts';
import { useDeleteTransaction, useTransactions } from '@/core/application/hooks/use-transactions';
import { type Transaction } from '@/core/domain/entities/transaction';
import { type Currency } from '@/core/domain/enums/account.enums';
import { type TransactionFilters as Filters } from '@/core/domain/schemas/transaction.schema';

import { ConfirmDialog } from '@/presentation/components/feedback/ConfirmDialog';
import { Pagination } from '@/presentation/components/ui/Pagination';

import { SettleForm } from './SettleForm';
import { TransactionCard } from './TransactionCard';
import { TransactionCardSkeleton } from './TransactionCardSkeleton';
import { TransactionFilters } from './TransactionFilters';
import { TransactionForm } from './TransactionForm';

interface TransactionListProps {
  accountId?: string;
}

export function TransactionList({ accountId }: TransactionListProps) {
  const t = useTranslations('transactions');
  const tDebts = useTranslations('transactions.debtsSummary');
  const tErrors = useTranslations('errors');
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<Filters>(() => {
    const initial: Filters = accountId ? { accountId } : {};
    const urlSearch = searchParams.get('search');
    const urlStatus = searchParams.get('status');
    if (urlSearch) initial.search = urlSearch;
    if (urlStatus === 'PENDING' || urlStatus === 'SETTLED') initial.status = urlStatus;
    return initial;
  });
  const [searchInput, setSearchInput] = useState(filters.search ?? '');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [settlingTransaction, setSettlingTransaction] = useState<Transaction | null>(null);

  // Debounce the free-form search input into the filters (and reset page).
  useEffect(() => {
    const handle = setTimeout(() => {
      setFilters((prev) => {
        if (prev.search === searchInput) return prev;
        return { ...prev, search: searchInput || undefined };
      });
      setPage(1);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const { data: paginatedData, isLoading } = useTransactions({ ...filters, page });
  const transactions = paginatedData?.data;
  const meta = paginatedData?.meta;
  const { data: accounts } = useAccounts(false);
  const deleteMutation = useDeleteTransaction();

  function getCurrency(txn: Transaction): Currency {
    const account = accounts?.find((a) => a.id === txn.accountId);
    return account?.currency ?? 'PEN';
  }

  function handleFiltersChange(newFilters: Filters) {
    setFilters(newFilters);
    setPage(1);
  }

  function handleEdit(transaction: Transaction) {
    setEditingTransaction(transaction);
    setFormOpen(true);
  }

  function handleCloseForm() {
    setFormOpen(false);
    setEditingTransaction(null);
  }

  function handleDeleteConfirm() {
    if (!deletingTransaction) return;
    deleteMutation.mutate(deletingTransaction.id, {
      onSuccess: () => {
        setDeletingTransaction(null);
        toast.success(t('deleteTransaction'));
      },
      onError: () => {
        toast.error(tErrors('generic'));
      },
    });
  }

  const isDebtOrLoan = deletingTransaction?.type === 'DEBT' || deletingTransaction?.type === 'LOAN';
  const deleteDescription = isDebtOrLoan
    ? `${t('deleteConfirm')} ${t('deleteDebtWarning')}`
    : t('deleteConfirm');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-36 animate-pulse rounded bg-muted" />
          <div className="h-10 w-40 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="space-y-3">
          <TransactionCardSkeleton />
          <TransactionCardSkeleton />
          <TransactionCardSkeleton />
          <TransactionCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/transactions/debts"
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-muted"
          >
            <HandCoins className="size-4" />
            <span className="hidden sm:inline">{tDebts('viewDebts')}</span>
          </Link>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-muted"
          >
            <Filter className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingTransaction(null);
              setFormOpen(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="size-4" />
            {t('createTransaction')}
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>

      {showFilters && <TransactionFilters filters={filters} onChange={handleFiltersChange} />}

      {!transactions?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <p className="max-w-xs text-muted-foreground">
            {Object.values(filters).some(Boolean) ? t('emptyStateFiltered') : t('emptyState')}
          </p>
          {!Object.values(filters).some(Boolean) && (
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="size-4" />
              {t('createTransaction')}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {transactions.map((transaction, index) => (
              <TransactionCard
                key={transaction.id}
                transaction={transaction}
                currency={getCurrency(transaction)}
                isLast={index === transactions.length - 1}
                onEdit={handleEdit}
                onDelete={setDeletingTransaction}
                onSettle={setSettlingTransaction}
              />
            ))}
          </div>
          {meta && <Pagination meta={meta} onPageChange={setPage} />}
        </>
      )}

      <TransactionForm
        open={formOpen}
        transaction={editingTransaction}
        defaultAccountId={accountId}
        onClose={handleCloseForm}
      />

      <ConfirmDialog
        open={!!deletingTransaction}
        title={t('deleteTransaction')}
        description={deleteDescription}
        variant="destructive"
        confirmLabel={t('deleteTransaction')}
        loading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingTransaction(null)}
      />

      {settlingTransaction && (
        <SettleForm
          open={!!settlingTransaction}
          transaction={settlingTransaction}
          currency={getCurrency(settlingTransaction)}
          defaultAccountId={accountId}
          onClose={() => setSettlingTransaction(null)}
        />
      )}
    </div>
  );
}
