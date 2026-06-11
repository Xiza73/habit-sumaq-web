'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Loader2 } from 'lucide-react';

import { type DebtLoan } from '@/core/domain/entities/debt-loan';

import { Input } from '@/presentation/components/ui/Input';
import { Modal } from '@/presentation/components/ui/Modal';

import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

type SettleMode = 'real' | 'informal';

interface DebtLoanRowSettleModalProps {
  row: DebtLoan | null;
  loading: boolean;
  onConfirm: (mode: SettleMode, amount: number) => void;
  onCancel: () => void;
}

export function DebtLoanRowSettleModal({
  row,
  loading,
  onConfirm,
  onCancel,
}: DebtLoanRowSettleModalProps) {
  const t = useTranslations('debts.detail');

  return (
    <Modal
      open={row !== null}
      onClose={onCancel}
      title={row ? t('settleTitle', { reference: row.reference }) : ''}
    >
      {row && (
        <Body key={row.id} row={row} loading={loading} onConfirm={onConfirm} onCancel={onCancel} />
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
  row: DebtLoan;
  loading: boolean;
  onConfirm: (mode: SettleMode, amount: number) => void;
  onCancel: () => void;
}) {
  const t = useTranslations('debts.detail');
  const tCommon = useTranslations('common');

  const [mode, setMode] = useState<SettleMode>('real');
  const [amount, setAmount] = useState<number>(row.remainingAmount);
  const [touched, setTouched] = useState(false);

  const invalid = amount <= 0 || amount > row.remainingAmount;

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-muted px-3 py-2 text-sm">
        <p className="text-xs text-muted-foreground">
          {t('remaining')}: {formatCurrency(row.remainingAmount, row.currency)}
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="dl-settle-amount" className="text-sm font-medium">
          {t('settleAmount')}
        </label>
        <Input
          id="dl-settle-amount"
          type="number"
          step="0.01"
          min="0.01"
          max={row.remainingAmount}
          value={Number.isFinite(amount) ? amount : ''}
          onChange={(e) => {
            setAmount(Number(e.target.value));
            setTouched(true);
          }}
        />
        {touched && invalid && <p className="text-xs text-destructive">{t('invalidAmount')}</p>}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t('settleMode')}</legend>

        <label
          className={cn(
            'flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 transition-colors',
            mode === 'real' ? 'border-primary bg-primary/5' : 'hover:bg-muted',
          )}
        >
          <input
            type="radio"
            name="row-settle-mode"
            value="real"
            checked={mode === 'real'}
            onChange={() => setMode('real')}
            className="mt-0.5"
          />
          <div className="text-sm">
            <p className="font-medium">{t('settleReal')}</p>
            <p className="text-xs text-muted-foreground">
              {t('settleRealHint', { currency: row.currency })}
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
            name="row-settle-mode"
            value="informal"
            checked={mode === 'informal'}
            onChange={() => setMode('informal')}
            className="mt-0.5"
          />
          <div className="text-sm">
            <p className="font-medium">{t('settleInformal')}</p>
            <p className="text-xs text-muted-foreground">{t('settleInformalHint')}</p>
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
          {tCommon('cancel')}
        </button>
        <button
          type="button"
          onClick={() => onConfirm(mode, amount)}
          disabled={loading || invalid}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          {t('settleConfirm')}
        </button>
      </div>
    </div>
  );
}
