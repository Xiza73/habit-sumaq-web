'use client';

import { useTranslations } from 'next-intl';

import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { useDeleteTransaction } from '@/core/application/hooks/use-transactions';
import { type Transaction } from '@/core/domain/entities/transaction';
import { type Currency } from '@/core/domain/enums/account.enums';

import { ApiError } from '@/infrastructure/api/api-error';

import { formatCurrency, getOnlyDateFromApi } from '@/lib/format';

interface BudgetMovementListProps {
  movements: Transaction[];
  currency: Currency;
}

/**
 * Inline list of budget movements rendered under the KPI card. Movements are
 * just transactions tagged with `budgetId` — deleting a movement here calls
 * the standard `DELETE /transactions/:id` endpoint, which the
 * `useDeleteTransaction` hook also wires through to invalidate the budget
 * KPI query (because deleting changes `spent`).
 *
 * Editing is intentionally NOT exposed here — the user can still edit via the
 * generic transactions list. Keeps this view focused on "log a new gasto"
 * and "remove a mistake".
 */
export function BudgetMovementList({ movements, currency }: BudgetMovementListProps) {
  const t = useTranslations('budgets');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');

  const deleteMutation = useDeleteTransaction();

  function handleDelete(tx: Transaction) {
    if (!confirm(t('movements.deleteConfirm'))) return;
    deleteMutation.mutate(tx.id, {
      onSuccess: () => {
        toast.success(t('movements.deleteSuccess'));
      },
      onError: (error) => {
        toast.error(
          error instanceof ApiError && error.code && tErrors.has(error.code)
            ? tErrors(error.code as 'TXN_001')
            : tErrors('generic'),
        );
      },
    });
  }

  if (movements.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card py-10 text-center">
        <p className="text-sm text-muted-foreground">{t('movements.empty')}</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {movements.map((tx) => (
        <li
          key={tx.id}
          className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {tx.description ?? t('movements.noDescription')}
            </p>
            <p className="text-xs text-muted-foreground">{getOnlyDateFromApi(tx.date)}</p>
          </div>
          <p className="shrink-0 font-semibold tabular-nums text-destructive">
            -{formatCurrency(tx.amount, currency)}
          </p>
          <button
            type="button"
            onClick={() => handleDelete(tx)}
            disabled={deleteMutation.isPending}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
            aria-label={tCommon('delete')}
          >
            <Trash2 className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
