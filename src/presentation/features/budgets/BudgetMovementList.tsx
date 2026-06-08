'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { useCategories } from '@/core/application/hooks/use-categories';
import { useDeleteTransaction } from '@/core/application/hooks/use-transactions';
import { useDateFormat } from '@/core/application/hooks/use-user-settings';
import { type Transaction } from '@/core/domain/entities/transaction';
import { type DateFormat } from '@/core/domain/enums/common.enums';
import { type Currency } from '@/core/domain/enums/currency.enum';

import { ApiError } from '@/infrastructure/api/api-error';

import { formatCurrency, formatDate } from '@/lib/format';
import { getTransactionDisplayTitle } from '@/lib/transaction-title';
import { cn } from '@/lib/utils';

interface BudgetMovementListProps {
  movements: Transaction[];
  currency: Currency;
  /**
   * Called when the user picks "Editar" from a row's kebab menu. Parent owns
   * the form state — passing the movement back triggers the edit modal.
   */
  onEdit: (movement: Transaction) => void;
}

/**
 * Inline list of budget movements rendered under the KPI card. Movements are
 * just transactions tagged with `budgetId`. Each row exposes Edit + Delete
 * via a kebab menu (same pattern as `TransactionCard`) — Edit hands the
 * movement to the parent so the form opens preselected, Delete calls
 * `DELETE /transactions/:id` directly and invalidates the budget KPI query.
 */
export function BudgetMovementList({ movements, currency, onEdit }: BudgetMovementListProps) {
  const t = useTranslations('budgets');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  // Localized type label resolver passed into the title-fallback helper.
  // Same `transactions.types.*` namespace the transactions list uses, so a
  // movement with no description and no category falls back to "Gasto"
  // instead of the old "Sin descripción" copy.
  const tTransactions = useTranslations('transactions');
  const dateFormat = useDateFormat();

  // Categories are needed for the second layer of the title fallback (when
  // the user didn't type a description, show the category name). Same O(1)
  // lookup pattern as TransactionList — `useCategories` is cached, so this
  // doesn't add a network round-trip in normal navigation.
  const { data: categories } = useCategories();
  const categoriesById = useMemo(
    () => new Map((categories ?? []).map((c) => [c.id, c])),
    [categories],
  );

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
      {movements.map((tx, index) => {
        const category = tx.categoryId ? categoriesById.get(tx.categoryId) : null;
        const titleText = getTransactionDisplayTitle(tx, category, (type) =>
          tTransactions(`types.${type}`),
        );
        return (
          <MovementRow
            key={tx.id}
            tx={tx}
            titleText={titleText}
            currency={currency}
            dateFormat={dateFormat}
            isLast={index === movements.length - 1}
            deleting={deleteMutation.isPending}
            onEdit={() => onEdit(tx)}
            onDelete={() => handleDelete(tx)}
            tCommon={tCommon}
            tBudgets={t}
          />
        );
      })}
    </ul>
  );
}

interface MovementRowProps {
  tx: Transaction;
  titleText: string;
  currency: Currency;
  dateFormat: DateFormat;
  /** Last row gets a slightly different menu anchor so it doesn't clip below. */
  isLast: boolean;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
  tCommon: ReturnType<typeof useTranslations<'common'>>;
  tBudgets: ReturnType<typeof useTranslations<'budgets'>>;
}

function MovementRow({
  tx,
  titleText,
  currency,
  dateFormat,
  isLast,
  deleting,
  onEdit,
  onDelete,
  tCommon,
  tBudgets,
}: MovementRowProps) {
  // Each row owns its own menu state — opening one closes the others
  // implicitly because the backdrop overlays the whole viewport (any click
  // outside the menu cascades to the backdrop). Same UX as `TransactionCard`.
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <li className="relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{titleText}</p>
        <p className="text-xs text-muted-foreground">{formatDate(tx.date, dateFormat)}</p>
      </div>
      <p className="shrink-0 font-semibold tabular-nums text-destructive">
        -{formatCurrency(tx.amount, currency)}
      </p>
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        disabled={deleting}
        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
        aria-label={tBudgets('movements.actionsAria')}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <MoreVertical className="size-4" />
      </button>

      {menuOpen && (
        <>
          {/* Backdrop — closes the menu on any click outside or Escape.
              `fixed inset-0` so clicking ANYWHERE outside the menu hits it
              (the menu itself sits above on a higher z-index). */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setMenuOpen(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setMenuOpen(false);
            }}
            role="button"
            tabIndex={0}
            aria-label="Close menu"
          />
          <div
            role="menu"
            className={cn(
              'absolute right-4 top-full z-20 mt-1 w-44 rounded-lg border border-border bg-popover py-1 shadow-lg',
              // Last-row anchor: avoids the menu falling off the bottom of
              // the card. Reroute upward by translating it above the row.
              isLast && 'top-auto bottom-full mb-1 mt-0',
            )}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                onEdit();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
            >
              <Pencil className="size-4" />
              {tCommon('edit')}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                onDelete();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-4" />
              {tCommon('delete')}
            </button>
          </div>
        </>
      )}
    </li>
  );
}
