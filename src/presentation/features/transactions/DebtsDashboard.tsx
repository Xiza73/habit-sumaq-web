'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { useDebtsSummary, useSettleByReference } from '@/core/application/hooks/use-transactions';
import {
  type DebtsSummaryRow,
  type DebtsSummaryStatusFilter,
} from '@/core/domain/schemas/transaction.schema';

import { ConfirmDialog } from '@/presentation/components/feedback/ConfirmDialog';

import { cn } from '@/lib/utils';

import { DebtCard } from './DebtCard';

const STATUS_OPTIONS: DebtsSummaryStatusFilter[] = ['pending', 'all', 'settled'];

export function DebtsDashboard() {
  const t = useTranslations('transactions.debtsSummary');
  const tErrors = useTranslations('errors');
  const [status, setStatus] = useState<DebtsSummaryStatusFilter>('pending');
  const [settlingRow, setSettlingRow] = useState<DebtsSummaryRow | null>(null);
  const { data: rows = [], isLoading } = useDebtsSummary(status);
  const settleMutation = useSettleByReference();

  const emptyMessage = status === 'pending' ? t('emptyPending') : t('empty');

  function handleSettleConfirm() {
    if (!settlingRow) return;
    settleMutation.mutate(
      { reference: settlingRow.displayName, currency: settlingRow.currency },
      {
        onSuccess: () => {
          toast.success(
            t('settleAllSuccess', {
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
          <Link
            href="/transactions"
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            {t('backToList')}
          </Link>
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
            <DebtCard
              key={`${row.reference}-${row.currency}`}
              row={row}
              onSettleAll={setSettlingRow}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!settlingRow}
        title={
          settlingRow
            ? t('settleAllConfirmTitle', {
                name: settlingRow.displayName,
                currency: settlingRow.currency,
              })
            : ''
        }
        description={
          settlingRow
            ? t('settleAllConfirmBody', {
                count: settlingRow.pendingCount,
                currency: settlingRow.currency,
              })
            : ''
        }
        variant="destructive"
        confirmLabel={t('settleAll')}
        loading={settleMutation.isPending}
        onConfirm={handleSettleConfirm}
        onCancel={() => setSettlingRow(null)}
      />
    </div>
  );
}
