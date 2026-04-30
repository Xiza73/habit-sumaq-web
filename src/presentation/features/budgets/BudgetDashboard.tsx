'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { toast } from 'sonner';

import {
  useBudgets,
  useCurrentBudget,
  useDeleteBudget,
} from '@/core/application/hooks/use-budgets';
import { useUserSettings } from '@/core/application/hooks/use-user-settings';
import { type Budget } from '@/core/domain/entities/budget';
import { type Currency } from '@/core/domain/enums/account.enums';

import { ApiError } from '@/infrastructure/api/api-error';

import { ConfirmDialog } from '@/presentation/components/feedback/ConfirmDialog';

import { cn } from '@/lib/utils';

import { AddMovementForm } from './AddMovementForm';
import { BudgetForm } from './BudgetForm';
import { BudgetHistoryList } from './BudgetHistoryList';
import { BudgetKpiCard } from './BudgetKpiCard';
import { BudgetMovementList } from './BudgetMovementList';
import { EmptyBudgetCta } from './EmptyBudgetCta';

const CURRENCIES: Currency[] = ['PEN', 'USD', 'EUR'];

/**
 * Top-level page for `/budgets`. Picks a currency (defaults to the user's
 * preferred), fetches the current month's budget for that currency, and
 * renders either the KPI dashboard or an "create budget" CTA. The history
 * list of past budgets sits below — links go to the read-only detail view.
 */
export function BudgetDashboard() {
  const t = useTranslations('budgets');
  const tErrors = useTranslations('errors');
  const { data: settings } = useUserSettings();

  const [pickedCurrency, setPickedCurrency] = useState<Currency | null>(null);
  // Derived state — settings may load AFTER first render, so we fall back to
  // PEN until settings arrive, then to the user's default. The user's pick
  // wins as soon as they touch the toggle. Avoids syncing prop → state in an
  // effect (the React Compiler way).
  const currency: Currency = pickedCurrency ?? settings?.defaultCurrency ?? 'PEN';

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [movementOpen, setMovementOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Budget | null>(null);

  const { data: currentBudget, isLoading } = useCurrentBudget(currency);
  const { data: allBudgets = [] } = useBudgets();
  const deleteMutation = useDeleteBudget();

  // Compute "what month should we show in the empty CTA?" — fall back to
  // local now if we don't yet know the server's current month (it would
  // come embedded in `currentBudget.year/month` when present).
  const nowYearMonth = useMemo(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }, []);

  // History excludes the active month for the active currency — it's already
  // rendered as the dashboard above and we don't want duplicate cards.
  const historyBudgets = useMemo(() => {
    if (!currentBudget) return allBudgets;
    return allBudgets.filter((b) => b.id !== currentBudget.id);
  }, [allBudgets, currentBudget]);

  function handleConfirmDelete() {
    if (!pendingDelete) return;
    deleteMutation.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success(t('delete.success'));
        setPendingDelete(null);
      },
      onError: (error) => {
        toast.error(
          error instanceof ApiError && error.code && tErrors.has(error.code)
            ? tErrors(error.code as 'BDGT_001')
            : tErrors('generic'),
        );
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>

        <div className="flex w-full rounded-lg border border-border p-1 sm:inline-flex sm:w-auto">
          {CURRENCIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setPickedCurrency(c)}
              className={cn(
                'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:flex-none sm:px-4',
                currency === c
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-muted" />
      ) : currentBudget ? (
        <>
          <BudgetKpiCard
            budget={currentBudget}
            onAddMovement={() => setMovementOpen(true)}
            onEdit={() => setEditOpen(true)}
            onDelete={() => setPendingDelete(currentBudget)}
          />
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">{t('movements.title')}</h2>
            <BudgetMovementList movements={currentBudget.movements} currency={currency} />
          </div>
        </>
      ) : (
        <EmptyBudgetCta
          currency={currency}
          year={nowYearMonth.year}
          month={nowYearMonth.month}
          onCreate={() => setCreateOpen(true)}
        />
      )}

      <BudgetHistoryList budgets={historyBudgets} />

      {/* Modals */}
      <BudgetForm
        open={createOpen}
        budget={null}
        defaultCurrency={currency}
        defaultYear={nowYearMonth.year}
        defaultMonth={nowYearMonth.month}
        onClose={() => setCreateOpen(false)}
      />
      <BudgetForm
        open={editOpen}
        budget={currentBudget ?? null}
        onClose={() => setEditOpen(false)}
      />
      <AddMovementForm
        open={movementOpen}
        budget={currentBudget ?? null}
        onClose={() => setMovementOpen(false)}
      />
      <ConfirmDialog
        open={!!pendingDelete}
        title={t('delete.title')}
        description={t('delete.description')}
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
