'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  useDebtLoanPayments,
  useDeleteDebtLoanPayment,
  useUpdateDebtLoanPayment,
} from '@/core/application/hooks/use-debts-loans';
import { type DebtLoanPayment } from '@/core/domain/entities/debt-loan';
import { type Currency } from '@/core/domain/enums/currency.enum';

import { ApiError } from '@/infrastructure/api/api-error';

import { DatePicker } from '@/presentation/components/ui/DatePicker';

import { formatCurrency } from '@/lib/format';

/**
 * Payment history for a single active debt/loan row. Rendered inline
 * under the row in `DebtLoanDetailModal`, only when the row has at
 * least one settle applied (`remainingAmount < amount`).
 *
 * Each item exposes inline edit + delete. Mutations rely on
 * invalidating the entire `debts-loans` cache — overpayment recompute
 * may flip the parent's status and move the pool, so the summary, the
 * list, and the payment history all need to refetch on success.
 */
interface DebtLoanPaymentsListProps {
  debtId: string;
  /** Parent's currency, used when the payment row is informal (currency = null). */
  fallbackCurrency: Currency;
}

export function DebtLoanPaymentsList({ debtId, fallbackCurrency }: DebtLoanPaymentsListProps) {
  const t = useTranslations('debts.detail.payments');
  const tErrors = useTranslations('errors');

  const { data: payments = [], isLoading, isError } = useDebtLoanPayments(debtId);
  const updateMutation = useUpdateDebtLoanPayment();
  const deleteMutation = useDeleteDebtLoanPayment();

  // Tracks which payment is currently in edit mode. Only one at a time
  // — the UI keeps the rest as read-only rows.
  const [editingId, setEditingId] = useState<string | null>(null);

  function showError(err: unknown) {
    toast.error(
      err instanceof ApiError && err.code && tErrors.has(err.code)
        ? tErrors(err.code as 'DBL_001')
        : tErrors('generic'),
    );
  }

  function handleDelete(payment: DebtLoanPayment) {
    if (!confirm(t('deleteConfirm'))) return;
    deleteMutation.mutate(payment.id, {
      onSuccess: () => toast.success(t('deleteSuccess')),
      onError: showError,
    });
  }

  function handleSave(payment: DebtLoanPayment, amount: number, note: string, paidAt: string) {
    const trimmedNote = note.trim();
    const data: { amount?: number; note?: string | null; paidAt?: string } = {};
    if (amount !== payment.amount) data.amount = amount;
    // Backend treats `null` as "clear the note". A blank submit on a
    // previously-empty note is a no-op we don't want to send (would
    // trigger DBT_009).
    const prevNote = payment.note ?? '';
    if (trimmedNote !== prevNote) data.note = trimmedNote === '' ? null : trimmedNote;

    // Compared on the calendar day, which is all the picker can express —
    // comparing full instants would send a "change" on every save, since the
    // stored time-of-day is not in the control.
    if (paidAt !== payment.paidAt.slice(0, 10)) {
      data.paidAt = new Date(`${paidAt}T12:00:00`).toISOString();
    }

    if (Object.keys(data).length === 0) {
      // Nothing actually changed — collapse the form and skip the
      // network roundtrip. Avoids the DBT_009 422 the backend would
      // throw on an empty diff.
      setEditingId(null);
      return;
    }

    updateMutation.mutate(
      { paymentId: payment.id, data },
      {
        onSuccess: () => {
          toast.success(t('updateSuccess'));
          setEditingId(null);
        },
        onError: showError,
      },
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        {t('loading')}
      </div>
    );
  }

  if (isError) {
    return <p className="py-2 text-xs text-destructive">{t('loadError')}</p>;
  }

  if (payments.length === 0) return null;

  return (
    <ul className="mt-2 space-y-1.5 border-t border-border pt-2">
      {payments.map((p) =>
        editingId === p.id ? (
          <PaymentEditRow
            key={p.id}
            payment={p}
            fallbackCurrency={fallbackCurrency}
            saving={updateMutation.isPending}
            onCancel={() => setEditingId(null)}
            onSave={(amount, note, paidAt) => handleSave(p, amount, note, paidAt)}
          />
        ) : (
          <PaymentReadRow
            key={p.id}
            payment={p}
            fallbackCurrency={fallbackCurrency}
            disabled={deleteMutation.isPending || updateMutation.isPending}
            onEdit={() => setEditingId(p.id)}
            onDelete={() => handleDelete(p)}
          />
        ),
      )}
    </ul>
  );
}

function PaymentReadRow({
  payment,
  fallbackCurrency,
  disabled,
  onEdit,
  onDelete,
}: {
  payment: DebtLoanPayment;
  fallbackCurrency: Currency;
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations('debts.detail.payments');
  const displayCurrency = payment.currency ?? fallbackCurrency;
  return (
    <li className="flex items-start justify-between gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-xs">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold">{formatCurrency(payment.amount, displayCurrency)}</span>
          {payment.currency === null && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              {t('informal')}
            </span>
          )}
          <span className="text-muted-foreground">
            · {new Date(payment.paidAt).toLocaleDateString()}
          </span>
        </div>
        {payment.note && <p className="mt-0.5 break-words text-muted-foreground">{payment.note}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={onEdit}
          disabled={disabled}
          className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-50"
          title={t('edit')}
          aria-label={t('edit')}
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          className="rounded p-1 text-destructive hover:bg-destructive/10 disabled:opacity-50"
          title={t('delete')}
          aria-label={t('delete')}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </li>
  );
}

function PaymentEditRow({
  payment,
  fallbackCurrency,
  saving,
  onCancel,
  onSave,
}: {
  payment: DebtLoanPayment;
  fallbackCurrency: Currency;
  saving: boolean;
  onCancel: () => void;
  onSave: (amount: number, note: string, paidAt: string) => void;
}) {
  const t = useTranslations('debts.detail.payments');
  const [amount, setAmount] = useState(String(payment.amount));
  const [note, setNote] = useState(payment.note ?? '');
  // `YYYY-MM-DD` for the picker; the instant is rebuilt on submit.
  const [paidAt, setPaidAt] = useState(payment.paidAt.slice(0, 10));

  const parsedAmount = Number(amount);
  const isAmountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const displayCurrency = payment.currency ?? fallbackCurrency;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAmountValid || saving) return;
    onSave(parsedAmount, note, paidAt);
  }

  return (
    <li className="rounded-md border border-border bg-card px-2 py-2 text-xs">
      <form onSubmit={handleSubmit} className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <label className="flex flex-1 items-center gap-1 text-muted-foreground">
            <span className="sr-only">{t('amountLabel')}</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={saving}
              className="w-24 rounded border border-border bg-background px-2 py-1 text-foreground"
              aria-label={t('amountLabel')}
              autoFocus
            />
            <span className="text-[10px] uppercase tracking-wide">{displayCurrency}</span>
          </label>

          <div className="w-40">
            <DatePicker
              compact
              value={paidAt}
              onChange={setPaidAt}
              disabled={saving}
              aria-label={t('paidAtLabel')}
            />
          </div>
        </div>
        <input
          type="text"
          maxLength={255}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={saving}
          placeholder={t('notePlaceholder')}
          aria-label={t('noteLabel')}
          className="w-full rounded border border-border bg-background px-2 py-1 text-foreground"
        />
        <div className="flex justify-end gap-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded px-2 py-1 text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={!isAmountValid || saving}
            className="inline-flex items-center gap-1 rounded bg-primary px-2 py-1 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving && <Loader2 className="size-3 animate-spin" aria-hidden />}
            {t('save')}
          </button>
        </div>
      </form>
    </li>
  );
}
