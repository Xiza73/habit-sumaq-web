'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Loader2 } from 'lucide-react';

import { type DebtLoanSummaryRow, type DebtLoanType } from '@/core/domain/entities/debt-loan';

import { Input } from '@/presentation/components/ui/Input';
import { Modal } from '@/presentation/components/ui/Modal';

import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

type SettleMode = 'real' | 'informal';

export interface DebtLoanSettleInput {
  type: DebtLoanType;
  amount: number;
  realPayment: boolean;
}

interface DebtLoanSettleModalProps {
  row: DebtLoanSummaryRow | null;
  loading: boolean;
  onConfirm: (input: DebtLoanSettleInput) => void;
  onCancel: () => void;
}

/**
 * Amount-settle modal for the v1.0.0 `debts_loans` module — replaces the old
 * all-or-nothing bulk-settle. The user picks:
 *
 *  - a **direction** (DEBT = pay what I owe / LOAN = collect what I'm owed).
 *    Only shown as a selector when the person has pending on BOTH sides;
 *    otherwise it locks to the single side with pending.
 *  - an **amount** (capped at the selected direction's pending total, with a
 *    "Todo" shortcut). The backend distributes it FIFO (oldest-first).
 *  - a **mode** (real-payment moves the currency pool / informal-close only
 *    marks SETTLED).
 *
 * State lives in `<Body>`; the outer shell remounts via
 * `key={row.reference + row.currency}` so reopening for another row resets
 * the selection without a setState-in-effect.
 */
export function DebtLoanSettleModal({
  row,
  loading,
  onConfirm,
  onCancel,
}: DebtLoanSettleModalProps) {
  const t = useTranslations('debts.settle');

  return (
    <Modal
      open={row !== null}
      onClose={onCancel}
      title={row ? t('title', { name: row.displayName }) : ''}
    >
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
  onConfirm: (input: DebtLoanSettleInput) => void;
  onCancel: () => void;
}) {
  const t = useTranslations('debts.settle');

  const hasDebt = row.pendingDebt > 0;
  const hasLoan = row.pendingLoan > 0;
  const bothDirections = hasDebt && hasLoan;

  const pendingFor = (type: DebtLoanType) => (type === 'DEBT' ? row.pendingDebt : row.pendingLoan);

  const [type, setType] = useState<DebtLoanType>(hasDebt ? 'DEBT' : 'LOAN');
  const [amount, setAmount] = useState<number>(pendingFor(hasDebt ? 'DEBT' : 'LOAN'));
  const [mode, setMode] = useState<SettleMode>('real');
  const [touched, setTouched] = useState(false);

  const pending = pendingFor(type);
  const invalid = !(amount > 0) || amount > pending;

  function selectDirection(next: DebtLoanType) {
    setType(next);
    // Refill the amount with the new direction's pending total so the field
    // always reflects a valid default for the current side.
    setAmount(pendingFor(next));
    setTouched(false);
  }

  function handleConfirm() {
    if (invalid) {
      setTouched(true);
      return;
    }
    onConfirm({ type, amount, realPayment: mode === 'real' });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-muted px-3 py-2 text-sm">
        <p className="font-medium">{row.displayName}</p>
        <p className="text-xs text-muted-foreground">
          {t('pendingTotal', { amount: formatCurrency(pending, row.currency) })}
        </p>
      </div>

      {bothDirections ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t('direction')}</legend>
          {(['DEBT', 'LOAN'] as const).map((dir) => (
            <label
              key={dir}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 text-sm transition-colors',
                type === dir ? 'border-primary bg-primary/5' : 'hover:bg-muted',
              )}
            >
              <input
                type="radio"
                name="dl-settle-direction"
                value={dir}
                checked={type === dir}
                onChange={() => selectDirection(dir)}
              />
              <span className="font-medium">
                {dir === 'DEBT' ? t('directionDebt') : t('directionLoan')}
              </span>
            </label>
          ))}
        </fieldset>
      ) : (
        <p className="text-sm font-medium">
          {type === 'DEBT' ? t('directionDebt') : t('directionLoan')}
        </p>
      )}

      <div className="space-y-2">
        <label htmlFor="dl-settle-amount-by-ref" className="text-sm font-medium">
          {t('amount')}
        </label>
        <div className="flex items-center gap-2">
          <Input
            id="dl-settle-amount-by-ref"
            type="number"
            step="0.01"
            min="0.01"
            max={pending}
            value={Number.isFinite(amount) ? amount : ''}
            onChange={(e) => {
              setAmount(Number(e.target.value));
              setTouched(true);
            }}
          />
          <button
            type="button"
            onClick={() => {
              setAmount(pending);
              setTouched(true);
            }}
            className="shrink-0 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            {t('all')}
          </button>
        </div>
        {touched && invalid && <p className="text-xs text-destructive">{t('invalidAmount')}</p>}
        <p className="text-xs text-muted-foreground">{t('fifoNote')}</p>
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
            name="dl-settle-mode"
            value="real"
            checked={mode === 'real'}
            onChange={() => setMode('real')}
            className="mt-0.5"
          />
          <div className="text-sm">
            <p className="font-medium">{t('real')}</p>
            <p className="text-xs text-muted-foreground">
              {t('realHint', { currency: row.currency })}
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
            name="dl-settle-mode"
            value="informal"
            checked={mode === 'informal'}
            onChange={() => setMode('informal')}
            className="mt-0.5"
          />
          <div className="text-sm">
            <p className="font-medium">{t('informal')}</p>
            <p className="text-xs text-muted-foreground">{t('informalHint')}</p>
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
          onClick={handleConfirm}
          disabled={loading || invalid}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          {t('confirm')}
        </button>
      </div>
    </div>
  );
}
