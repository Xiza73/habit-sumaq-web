'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import {
  useDebtsLoansSummary,
  useSettleAmountByReference,
} from '@/core/application/hooks/use-debts-loans';
import { useViewMode } from '@/core/application/hooks/use-view-mode';
import {
  type DebtLoan,
  type DebtLoanStatusFilter,
  type DebtLoanSummaryRow,
  type DebtLoanType,
} from '@/core/domain/entities/debt-loan';
import { type Currency } from '@/core/domain/enums/currency.enum';

import { ApiError } from '@/infrastructure/api/api-error';

import { ViewModeToggle } from '@/presentation/components/ui/ViewModeToggle';

import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

import { DebtLoanDetailModal } from './DebtLoanDetailModal';
import { DebtLoanForm } from './DebtLoanForm';
import { type DebtLoanSettleInput, DebtLoanSettleModal } from './DebtLoanSettleModal';
import { DebtLoanSummaryCard } from './DebtLoanSummaryCard';
import { type DebtsViewPrefs, DEFAULT_DEBTS_VIEW_PREFS, sortDebtRows } from './debts-sort';
import { DebtsLoansTable } from './DebtsLoansTable';
import { DebtsViewControls } from './DebtsViewControls';

const STATUS_OPTIONS: DebtLoanStatusFilter[] = ['pending', 'all', 'settled'];

/**
 * Dashboard for the v1.0.0 `debts_loans` module.
 *
 *  - Summary cards grouped by `(reference, currency)` via GET /debts/summary.
 *  - Status filter (pending / all / settled).
 *  - Settle via POST /debts/settle-amount-by-reference (pick a direction +
 *    amount, distributed FIFO; dual-mode UX: real-payment vs informal-close —
 *    no account picker, the currency pool is internal).
 *  - **Create / edit** via `DebtLoanForm` — added in the post-A6 UI gap fix
 *    after `/transactions` (which used to host the create flow) was dropped.
 *  - **Detail view** via `DebtLoanDetailModal` — opens when a summary card is
 *    clicked. Shows every row in the group with per-row settle / edit /
 *    delete.
 */
export function DebtsLoansDashboard() {
  const t = useTranslations('debts');
  const tErrors = useTranslations('errors');
  const [status, setStatus] = useState<DebtLoanStatusFilter>('pending');
  const [settlingRow, setSettlingRow] = useState<DebtLoanSummaryRow | null>(null);
  const [detailRow, setDetailRow] = useState<DebtLoanSummaryRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formInitialType, setFormInitialType] = useState<DebtLoanType>('DEBT');
  const [formInitialReference, setFormInitialReference] = useState<string | undefined>(undefined);
  const [formInitialCurrency, setFormInitialCurrency] = useState<Currency | undefined>(undefined);
  const [editingDebtLoan, setEditingDebtLoan] = useState<DebtLoan | null>(null);
  const [viewPrefs, setViewPrefs] = useState<DebtsViewPrefs>(DEFAULT_DEBTS_VIEW_PREFS);
  const [viewMode, setViewMode] = useViewMode('debts-loans');

  const { data: rows = [], isLoading } = useDebtsLoansSummary(status);
  // Always pull the full set (any status) just to feed the reference
  // autocomplete, so past persons stay suggestible even when the current
  // filter hides them.
  const { data: allRows = [] } = useDebtsLoansSummary('all');
  const settleMutation = useSettleAmountByReference();

  const sortedRows = useMemo(() => sortDebtRows(rows, viewPrefs), [rows, viewPrefs]);

  const knownReferences = useMemo(() => {
    // Use `displayName` (original casing shown on the card), NOT `reference`
    // (the lowercased/unaccented grouping key) — otherwise suggestions render
    // all-lowercase.
    const set = new Set<string>();
    allRows.forEach((r) => {
      if (r.displayName) set.add(r.displayName);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allRows]);
  const emptyMessage = status === 'pending' ? t('emptyPending') : t('empty');

  function openCreate(type: DebtLoanType) {
    setEditingDebtLoan(null);
    setFormInitialType(type);
    setFormInitialReference(undefined);
    setFormInitialCurrency(undefined);
    setFormOpen(true);
  }

  function handleQuickAdd(row: DebtLoanSummaryRow, type: DebtLoanType) {
    setEditingDebtLoan(null);
    setFormInitialType(type);
    // Original casing shown on the card, not the normalized grouping key.
    setFormInitialReference(row.displayName);
    setFormInitialCurrency(row.currency);
    setFormOpen(true);
  }

  function openEdit(debtLoan: DebtLoan) {
    setEditingDebtLoan(debtLoan);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingDebtLoan(null);
  }

  function handleSettleConfirm({ type, amount, realPayment }: DebtLoanSettleInput) {
    if (!settlingRow) return;
    const name = settlingRow.displayName;
    settleMutation.mutate(
      {
        reference: settlingRow.displayName,
        currency: settlingRow.currency,
        type,
        amount,
        realPayment,
      },
      {
        onSuccess: (result) => {
          toast.success(
            t('settle.success', {
              name,
              amount: formatCurrency(result.totalSettledAmount, result.currency),
              count: result.settledCount,
            }),
          );
          setSettlingRow(null);
        },
        onError: (err) => {
          toast.error(
            err instanceof ApiError && err.code && tErrors.has(err.code)
              ? tErrors(err.code as 'DBT_011')
              : tErrors('generic'),
          );
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          <button
            type="button"
            onClick={() => openCreate('DEBT')}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <Plus className="size-3.5" />
            {t('newDebt')}
          </button>
          <button
            type="button"
            onClick={() => openCreate('LOAN')}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-3.5" />
            {t('newLoan')}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full rounded-lg border border-border p-1 sm:inline-flex sm:w-auto">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setStatus(opt)}
              className={cn(
                'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:flex-none',
                status === opt
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t(`statusFilter.${opt}`)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <DebtsViewControls prefs={viewPrefs} onChange={setViewPrefs} />
          <ViewModeToggle mode={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : sortedRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <p className="max-w-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : viewMode === 'table' ? (
        <DebtsLoansTable
          rows={sortedRows}
          onSettle={setSettlingRow}
          onQuickAdd={handleQuickAdd}
          onRowClick={setDetailRow}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedRows.map((row) => (
            <DebtLoanSummaryCard
              key={`${row.reference}-${row.currency}`}
              row={row}
              onSettle={setSettlingRow}
              onClick={setDetailRow}
              onQuickAdd={handleQuickAdd}
            />
          ))}
        </div>
      )}

      <DebtLoanSettleModal
        row={settlingRow}
        loading={settleMutation.isPending}
        onConfirm={handleSettleConfirm}
        onCancel={() => setSettlingRow(null)}
      />

      <DebtLoanDetailModal row={detailRow} onClose={() => setDetailRow(null)} onEdit={openEdit} />

      <DebtLoanForm
        open={formOpen}
        debtLoan={editingDebtLoan}
        initialType={formInitialType}
        initialReference={formInitialReference}
        initialCurrency={formInitialCurrency}
        onClose={closeForm}
        knownReferences={knownReferences}
      />
    </div>
  );
}
