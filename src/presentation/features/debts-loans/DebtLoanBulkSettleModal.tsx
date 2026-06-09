'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Loader2 } from 'lucide-react';

import { type DebtLoanSummaryRow } from '@/core/domain/entities/debt-loan';

import { Modal } from '@/presentation/components/ui/Modal';

import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

type BulkSettleMode = 'real' | 'informal';

interface DebtLoanBulkSettleModalProps {
  row: DebtLoanSummaryRow | null;
  loading: boolean;
  /**
   * When mode = 'real', the dashboard passes the row's currency to the
   * backend bulk-settle endpoint — that's what triggers the pool delta.
   * When mode = 'informal', the dashboard omits currency entirely.
   */
  onConfirm: (mode: BulkSettleMode) => void;
  onCancel: () => void;
}

/**
 * Bulk-settle modal for the v1.0.0 `debts_loans` module. The new module
 * does NOT need an `accountId` picker — the currency pool is internal
 * and inferred from the row's own currency. The user only chooses
 * between two modes:
 *
 *  - **Real-payment**: the bulk moves the currency pool by the net
 *    delta (LOANs - DEBTs).
 *  - **Informal-close**: only marks SETTLED. Pool is untouched.
 *
 * State (mode) lives in `<Body>`; the outer shell remounts via
 * `key={row.reference + row.currency}` so opening for a different row
 * resets the selection without a setState-in-effect.
 */
export function DebtLoanBulkSettleModal({
  row,
  loading,
  onConfirm,
  onCancel,
}: DebtLoanBulkSettleModalProps) {
  const t = useTranslations('debts.bulkSettle');

  return (
    <Modal open={row !== null} onClose={onCancel} title={t('title')}>
      {row && (
        <Body
          key={`${row.reference}-${row.currency}`}
          row={row}
          loading={loading}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      )}
    </Modal>
  );
}

function Body({
  row,
  loading,
  onConfirm,
  onCancel,
}: {
  row: DebtLoanSummaryRow;
  loading: boolean;
  onConfirm: (mode: BulkSettleMode) => void;
  onCancel: () => void;
}) {
  const t = useTranslations('debts.bulkSettle');
  const [mode, setMode] = useState<BulkSettleMode>('real');

  const totalPending = row.pendingDebt + row.pendingLoan;
  const netDirection = row.netOwed > 0 ? 'theyOweYou' : 'youOwe';

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-muted px-3 py-2 text-sm">
        <p className="font-medium">{row.displayName}</p>
        <p className="text-xs text-muted-foreground">
          {t('totalPending', {
            amount: formatCurrency(totalPending, row.currency),
            count: row.pendingCount,
          })}
        </p>
        {row.netOwed !== 0 && (
          <p className="mt-1 text-xs">
            {t(`netSummary.${netDirection}`, {
              amount: formatCurrency(Math.abs(row.netOwed), row.currency),
            })}
          </p>
        )}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t('mode')}</legend>

        <label
          className={cn(
            'flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 transition-colors',
            mode === 'real' ? 'border-primary bg-primary/5' : 'hover:bg-muted',
          )}
        >
          <input
            type="radio"
            name="mode"
            value="real"
            checked={mode === 'real'}
            onChange={() => setMode('real')}
            className="mt-0.5"
          />
          <div className="text-sm">
            <p className="font-medium">{t('real.title')}</p>
            <p className="text-xs text-muted-foreground">
              {t('real.description', { currency: row.currency })}
            </p>
          </div>
        </label>

        <label
          className={cn(
            'flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 transition-colors',
            mode === 'informal' ? 'border-primary bg-primary/5' : 'hover:bg-muted',
          )}
        >
          <input
            type="radio"
            name="mode"
            value="informal"
            checked={mode === 'informal'}
            onChange={() => setMode('informal')}
            className="mt-0.5"
          />
          <div className="text-sm">
            <p className="font-medium">{t('informal.title')}</p>
            <p className="text-xs text-muted-foreground">{t('informal.description')}</p>
          </div>
        </label>
      </fieldset>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
        >
          {t('cancel')}
        </button>
        <button
          type="button"
          onClick={() => onConfirm(mode)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          {t('confirm')}
        </button>
      </div>
    </div>
  );
}
