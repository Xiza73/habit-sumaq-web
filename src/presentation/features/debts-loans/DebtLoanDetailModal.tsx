'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  useDebtsLoans,
  useDeleteDebtLoan,
  useSettleDebtLoan,
} from '@/core/application/hooks/use-debts-loans';
import { type DebtLoan, type DebtLoanSummaryRow } from '@/core/domain/entities/debt-loan';

import { ApiError } from '@/infrastructure/api/api-error';

import { Modal } from '@/presentation/components/ui/Modal';

import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

import { DebtLoanRowSettleModal } from './DebtLoanRowSettleModal';

/**
 * Matches the backend's `LOWER(unaccent(reference))` grouping key. The
 * summary endpoint already returns the normalized form, so we need to
 * normalize the raw `debts_loans.reference` rows the same way to keep
 * them in sync with the card. Plain `.toLowerCase()` is NOT enough —
 * "María" stays "maría" without diacritic stripping, and never matches
 * the summary's "maria".
 */
function normalizeReference(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

interface DebtLoanDetailModalProps {
  row: DebtLoanSummaryRow | null;
  onClose: () => void;
  onEdit: (debtLoan: DebtLoan) => void;
}

/**
 * Modal showing every `DebtLoan` row that belongs to a single
 * `(reference, currency)` group. Driven by `useDebtsLoans('all')` and
 * filtered client-side — the backend doesn't expose a group-by-reference
 * detail endpoint, but the list is small enough that a single fetch is
 * cheap.
 *
 * Per-row actions:
 *   - Settle individual row (dual-mode: real-payment / informal-close).
 *   - Edit (forwards to the parent's edit modal via `onEdit`).
 *   - Delete (confirm + soft-delete).
 */
export function DebtLoanDetailModal({ row, onClose, onEdit }: DebtLoanDetailModalProps) {
  const t = useTranslations('debts.detail');
  const tErrors = useTranslations('errors');

  const { data: allRows = [], isLoading } = useDebtsLoans('all');
  const deleteMutation = useDeleteDebtLoan();
  const settleMutation = useSettleDebtLoan();

  const [settlingRow, setSettlingRow] = useState<DebtLoan | null>(null);

  const filtered = useMemo(() => {
    if (!row) return [];
    const refKey = normalizeReference(row.reference);
    return allRows
      .filter((r) => r.currency === row.currency && normalizeReference(r.reference) === refKey)
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'PENDING' ? -1 : 1;
        return b.date.localeCompare(a.date);
      });
  }, [allRows, row]);

  const pending = filtered.filter((r) => r.status === 'PENDING');
  const settled = filtered.filter((r) => r.status === 'SETTLED');

  function handleDelete(item: DebtLoan) {
    if (!confirm(t('deleteConfirm'))) return;
    deleteMutation.mutate(item.id, {
      onSuccess: () => toast.success(t('deleteSuccess')),
      onError: (err) =>
        toast.error(
          err instanceof ApiError && err.code && tErrors.has(err.code)
            ? tErrors(err.code as 'DBL_001')
            : tErrors('generic'),
        ),
    });
  }

  function handleSettleConfirm(mode: 'real' | 'informal', amount: number) {
    if (!settlingRow) return;
    settleMutation.mutate(
      {
        id: settlingRow.id,
        data: {
          settledAmount: amount,
          currency: mode === 'real' ? settlingRow.currency : undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success(t('settleSuccess'));
          setSettlingRow(null);
        },
        onError: (err) =>
          toast.error(
            err instanceof ApiError && err.code && tErrors.has(err.code)
              ? tErrors(err.code as 'DBL_001')
              : tErrors('generic'),
          ),
      },
    );
  }

  return (
    <>
      <Modal
        open={row !== null}
        onClose={onClose}
        title={row ? t('title', { name: row.displayName, currency: row.currency }) : ''}
      >
        {!row ? null : isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          <div className="space-y-4">
            {pending.length > 0 && (
              <Section
                label={t('rowsPending')}
                rows={pending}
                onSettle={setSettlingRow}
                onEdit={(d) => {
                  onClose();
                  onEdit(d);
                }}
                onDelete={handleDelete}
              />
            )}
            {settled.length > 0 && (
              <Section
                label={t('rowsSettled')}
                rows={settled}
                onSettle={null}
                onEdit={(d) => {
                  onClose();
                  onEdit(d);
                }}
                onDelete={handleDelete}
              />
            )}
          </div>
        )}
      </Modal>

      <DebtLoanRowSettleModal
        row={settlingRow}
        loading={settleMutation.isPending}
        onConfirm={handleSettleConfirm}
        onCancel={() => setSettlingRow(null)}
      />
    </>
  );
}

function Section({
  label,
  rows,
  onSettle,
  onEdit,
  onDelete,
}: {
  label: string;
  rows: DebtLoan[];
  onSettle: ((row: DebtLoan) => void) | null;
  onEdit: (row: DebtLoan) => void;
  onDelete: (row: DebtLoan) => void;
}) {
  const t = useTranslations('debts.detail');

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </h3>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm">
                {r.type === 'DEBT' ? (
                  <ArrowUpRight className="size-3.5 shrink-0 text-destructive" aria-hidden />
                ) : (
                  <ArrowDownLeft
                    className="size-3.5 shrink-0 text-green-700 dark:text-green-400"
                    aria-hidden
                  />
                )}
                <span
                  className={cn(
                    'font-semibold',
                    r.type === 'DEBT' ? 'text-destructive' : 'text-green-700 dark:text-green-400',
                  )}
                >
                  {formatCurrency(r.amount, r.currency)}
                </span>
                {r.status === 'PENDING' && r.remainingAmount !== r.amount && (
                  <span className="text-xs text-muted-foreground">
                    · {t('remaining')}: {formatCurrency(r.remainingAmount, r.currency)}
                  </span>
                )}
                {r.status === 'SETTLED' && (
                  <CheckCircle2
                    className="size-3.5 text-green-700 dark:text-green-400"
                    aria-hidden
                  />
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {new Date(r.date).toLocaleDateString()}
                {r.description ? ` · ${r.description}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {onSettle && (
                <button
                  type="button"
                  onClick={() => onSettle(r)}
                  className="rounded-md p-1.5 text-primary hover:bg-muted"
                  title={t('settle')}
                  aria-label={t('settle')}
                >
                  <CheckCircle2 className="size-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onEdit(r)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                title={t('edit')}
                aria-label={t('edit')}
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(r)}
                className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                title={t('delete')}
                aria-label={t('delete')}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
