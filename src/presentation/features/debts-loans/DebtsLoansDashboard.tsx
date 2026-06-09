'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { toast } from 'sonner';

import {
  useBulkSettleByReference,
  useDebtsLoansSummary,
} from '@/core/application/hooks/use-debts-loans';
import {
  type DebtLoanStatusFilter,
  type DebtLoanSummaryRow,
} from '@/core/domain/entities/debt-loan';

import { cn } from '@/lib/utils';

import { DebtLoanBulkSettleModal } from './DebtLoanBulkSettleModal';
import { DebtLoanSummaryCard } from './DebtLoanSummaryCard';

const STATUS_OPTIONS: DebtLoanStatusFilter[] = ['pending', 'all', 'settled'];

/**
 * Dashboard for the v1.0.0 `debts_loans` module. Slim version compared
 * to the legacy `/transactions/debts` view:
 *
 *  - List grouped by `(reference, currency)` via GET /debts/summary.
 *  - Status filter (pending / all / settled).
 *  - Bulk-settle via POST /debts/settle-by-reference, with the new
 *    dual-mode UX (real-payment vs informal-close) instead of an
 *    account picker.
 *
 * Not in this PR (lands in A6-W when we drop /transactions):
 *  - Create / edit form (today, use /transactions/new with type=DEBT).
 *  - View controls (sort, currency filter, grouping).
 */
export function DebtsLoansDashboard() {
  const t = useTranslations('debts');
  const tErrors = useTranslations('errors');
  const [status, setStatus] = useState<DebtLoanStatusFilter>('pending');
  const [settlingRow, setSettlingRow] = useState<DebtLoanSummaryRow | null>(null);

  const { data: rows = [], isLoading } = useDebtsLoansSummary(status);
  const settleMutation = useBulkSettleByReference();

  const emptyMessage = status === 'pending' ? t('emptyPending') : t('empty');

  function handleSettleConfirm(mode: 'real' | 'informal') {
    if (!settlingRow) return;
    settleMutation.mutate(
      {
        reference: settlingRow.displayName,
        // Presence of `currency` is the real-payment signal on the backend.
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
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <p className="max-w-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <DebtLoanSummaryCard
              key={`${row.reference}-${row.currency}`}
              row={row}
              onSettleAll={setSettlingRow}
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
    </div>
  );
}
