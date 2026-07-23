'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import {
  useBulkSettleByReference,
  useDebtsLoansSummary,
} from '@/core/application/hooks/use-debts-loans';
import {
  type DebtLoan,
  type DebtLoanStatusFilter,
  type DebtLoanSummaryRow,
  type DebtLoanType,
} from '@/core/domain/entities/debt-loan';

import { cn } from '@/lib/utils';

import { DebtLoanBulkSettleModal } from './DebtLoanBulkSettleModal';
import { DebtLoanDetailModal } from './DebtLoanDetailModal';
import { DebtLoanForm } from './DebtLoanForm';
import { DebtLoanSummaryCard } from './DebtLoanSummaryCard';
import { type DebtsViewPrefs, DEFAULT_DEBTS_VIEW_PREFS, sortDebtRows } from './debts-sort';
import { DebtsViewControls } from './DebtsViewControls';

const STATUS_OPTIONS: DebtLoanStatusFilter[] = ['pending', 'all', 'settled'];

/**
 * Dashboard for the v1.0.0 `debts_loans` module.
 *
 *  - Summary cards grouped by `(reference, currency)` via GET /debts/summary.
 *  - Status filter (pending / all / settled).
 *  - Bulk-settle via POST /debts/settle-by-reference (dual-mode UX:
 *    real-payment vs informal-close — no account picker, the currency
 *    pool is internal).
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
  const [editingDebtLoan, setEditingDebtLoan] = useState<DebtLoan | null>(null);
  const [viewPrefs, setViewPrefs] = useState<DebtsViewPrefs>(DEFAULT_DEBTS_VIEW_PREFS);

  const { data: rows = [], isLoading } = useDebtsLoansSummary(status);
  // Always pull the full set (any status) just to feed the reference
  // autocomplete, so past persons stay suggestible even when the current
  // filter hides them.
  const { data: allRows = [] } = useDebtsLoansSummary('all');
  const settleMutation = useBulkSettleByReference();

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

  function handleSettleConfirm(mode: 'real' | 'informal') {
    if (!settlingRow) return;
    settleMutation.mutate(
      {
        reference: settlingRow.displayName,
        currency: mode === 'real' ? settlingRow.currency : undefined,
      },
      {
        onSuccess: () => {
          toast.success(
            t(mode === 'real' ? 'bulkSettle.successReal' : 'bulkSettle.successInformal', {
              name: settlingRow.displayName,
              currency: settlingRow.currency,
            }),
          );
          setSettlingRow(null);
        },
        onError: () => {
          toast.error(tErrors('generic'));
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

        <DebtsViewControls prefs={viewPrefs} onChange={setViewPrefs} />
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
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedRows.map((row) => (
            <DebtLoanSummaryCard
              key={`${row.reference}-${row.currency}`}
              row={row}
              onSettleAll={setSettlingRow}
              onClick={setDetailRow}
            />
          ))}
        </div>
      )}

      <DebtLoanBulkSettleModal
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
        onClose={closeForm}
        knownReferences={knownReferences}
      />
    </div>
  );
}
