'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { useDeleteBudgetMovement } from '@/core/application/hooks/use-budget-movements';
import { useCategories } from '@/core/application/hooks/use-categories';
import { useDateFormat } from '@/core/application/hooks/use-user-settings';
import { type BudgetMovement } from '@/core/domain/entities/budget-movement';
import { type DateFormat } from '@/core/domain/enums/common.enums';
import { type Currency } from '@/core/domain/enums/currency.enum';

import { ApiError } from '@/infrastructure/api/api-error';

import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

interface BudgetMovementListProps {
  movements: BudgetMovement[];
  currency: Currency;
  /**
   * Called when the user picks "Editar" from a row's kebab menu. Parent owns
   * the form state — passing the movement back triggers the edit modal.
   */
  onEdit: (movement: BudgetMovement) => void;
}

/**
 * Inline list of budget movements rendered under the KPI card.
 *
 * v1.0.0 (Phase A6-W.1): reads `BudgetMovement[]` from the new
 * `/budget-movements` endpoint and deletes via `useDeleteBudgetMovement`.
 * Replaces the legacy "transactions tagged with budgetId" surface — the
 * domain entity no longer has `type` or `accountId`, so the title
 * fallback chain inlines: description → category → "Gasto" (always
 * EXPENSE by definition for a budget movement).
 */
export function BudgetMovementList({ movements, currency, onEdit }: BudgetMovementListProps) {
  const t = useTranslations('budgets');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  // We keep the localized "Gasto" label under the `transactions.types.*`
  // namespace until A6-W.3 reorganizes i18n. A budget movement IS always
  // an expense, so this fallback is constant per-locale.
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

  const deleteMutation = useDeleteBudgetMovement();

  function handleDelete(movement: BudgetMovement) {
    if (!confirm(t('movements.deleteConfirm'))) return;
    deleteMutation.mutate(movement.id, {
      onSuccess: () => {
        toast.success(t('movements.deleteSuccess'));
      },
      onError: (error) => {
        toast.error(
          error instanceof ApiError && error.code && tErrors.has(error.code)
            ? tErrors(error.code as 'BMV_001')
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
      {movements.map((movement, index) => {
        const category = movement.categoryId ? categoriesById.get(movement.categoryId) : null;
        // Two-layer fallback inline: description → category name →
        // localized "Gasto". A BudgetMovement has no `type`, so this is
        // the equivalent of `getTransactionDisplayTitle` minus the type
        // branch (always EXPENSE).
        const titleText = movement.description ?? category?.name ?? tTransactions('types.EXPENSE');
        return (
          <MovementRow
            key={movement.id}
            movement={movement}
            titleText={titleText}
            currency={currency}
            dateFormat={dateFormat}
            isLast={index === movements.length - 1}
            deleting={deleteMutation.isPending}
            onEdit={() => onEdit(movement)}
            onDelete={() => handleDelete(movement)}
            tCommon={tCommon}
            tBudgets={t}
          />
        );
      })}
    </ul>
  );
}

interface MovementRowProps {
  movement: BudgetMovement;
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
  movement,
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
        <p className="text-xs text-muted-foreground">{formatDate(movement.date, dateFormat)}</p>
      </div>
      <p className="shrink-0 font-semibold tabular-nums text-destructive">
        -{formatCurrency(movement.amount, currency)}
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
