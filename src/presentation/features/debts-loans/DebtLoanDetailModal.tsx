'use client';

import { useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Loader2,
  Pencil,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  useDebtsLoans,
  useDeleteDebtLoan,
  useSettleDebtLoan,
} from '@/core/application/hooks/use-debts-loans';
import { useDateFormat } from '@/core/application/hooks/use-user-settings';
import { type DebtLoan, type DebtLoanSummaryRow } from '@/core/domain/entities/debt-loan';

import { ApiError } from '@/infrastructure/api/api-error';

import { Modal } from '@/presentation/components/ui/Modal';
import { useExportNodeImage } from '@/presentation/hooks/use-export-node-image';

import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

import { DebtCardShareImage, SHARE_IMAGE_BACKGROUND } from './DebtCardShareImage';
import { DebtLoanPaymentsList } from './DebtLoanPaymentsList';
import { DebtLoanRowSettleModal } from './DebtLoanRowSettleModal';

/**
 * Builds a filesystem-safe `{person}-{currency}.png` name. Diacritics are
 * stripped and runs of unsafe characters collapse to a single dash so
 * "María José" / USD becomes "Maria-Jose-USD.png".
 */
function buildShareImageFilename(displayName: string, currency: string): string {
  const slug = displayName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'debt'}-${currency}.png`;
}

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
 * `(reference, currency)` group. Filtered client-side — the backend
 * doesn't expose a group-by-reference detail endpoint, but the per-status
 * list is small enough that a single fetch is cheap.
 *
 * Fetch is deferred by status: PENDING rows load with the modal, SETTLED
 * rows only load when the user opens the "Mostrar liquidados" collapse —
 * lots of users never need to see settled history, so we don't pay for
 * the wider fetch by default.
 *
 * Per-row actions:
 *   - Settle individual row (dual-mode: real-payment / informal-close).
 *   - Edit (forwards to the parent's edit modal via `onEdit`).
 *   - Delete (confirm + soft-delete).
 */
export function DebtLoanDetailModal({ row, onClose, onEdit }: DebtLoanDetailModalProps) {
  const t = useTranslations('debts.detail');
  const tErrors = useTranslations('errors');

  const [settlingRow, setSettlingRow] = useState<DebtLoan | null>(null);
  const [showSettled, setShowSettled] = useState(false);

  // Once the user opens "Show settled" we switch to status='all' so the
  // pending rows AND the settled ones come down in a single fetch — the
  // backend already serves a status=all endpoint, no point in two calls.
  const { data: allRows = [], isLoading } = useDebtsLoans(showSettled ? 'all' : 'pending');
  const deleteMutation = useDeleteDebtLoan();
  const settleMutation = useSettleDebtLoan();

  // Off-screen share card rasterized to PNG for copy/download.
  const shareRef = useRef<HTMLDivElement>(null);
  const { copyImage, downloadImage } = useExportNodeImage({
    backgroundColor: SHARE_IMAGE_BACKGROUND,
  });

  async function handleCopyImage() {
    const node = shareRef.current;
    if (!node || !row) return;
    try {
      const result = await copyImage(node, buildShareImageFilename(row.displayName, row.currency));
      if (result === 'copied') toast.success(t('shareImage.copySuccess'));
      else toast.info(t('shareImage.copyFallback'));
    } catch {
      toast.error(t('shareImage.error'));
    }
  }

  async function handleDownloadImage() {
    const node = shareRef.current;
    if (!node || !row) return;
    try {
      await downloadImage(node, buildShareImageFilename(row.displayName, row.currency));
      toast.success(t('shareImage.downloadSuccess'));
    } catch {
      toast.error(t('shareImage.error'));
    }
  }

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
        ) : filtered.length === 0 && row.settledCount === 0 ? (
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
            {row.settledCount > 0 && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowSettled((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  {showSettled ? (
                    <ChevronDown className="size-3.5" aria-hidden />
                  ) : (
                    <ChevronRight className="size-3.5" aria-hidden />
                  )}
                  {showSettled ? t('hideSettled') : t('showSettled', { count: row.settledCount })}
                </button>
                {showSettled && settled.length > 0 && (
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
          </div>
        )}

        {row && (
          <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => void handleCopyImage()}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
            >
              <Copy className="size-4" aria-hidden />
              {t('shareImage.copy')}
            </button>
            <button
              type="button"
              onClick={() => void handleDownloadImage()}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
            >
              <Download className="size-4" aria-hidden />
              {t('shareImage.download')}
            </button>
          </div>
        )}
      </Modal>

      {/* Off-screen (not display:none — html-to-image needs a laid-out node)
          share card, rasterized to PNG by the copy/download actions. */}
      {row && (
        <div aria-hidden="true" className="pointer-events-none fixed left-[-9999px] top-0">
          <DebtCardShareImage ref={shareRef} row={row} />
        </div>
      )}

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
  const tPayments = useTranslations('debts.detail.payments');
  const dateFormat = useDateFormat();

  // Tracks which row(s) the user has opened to see payment history.
  // Per-row Set so the user can keep several rows expanded at once.
  const [openPayments, setOpenPayments] = useState<Set<string>>(new Set());

  function togglePayments(rowId: string) {
    setOpenPayments((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </h3>
      <ul className="space-y-2">
        {rows.map((r) => {
          // Only active rows that have already received at least one
          // settle expose the payment history toggle. SETTLED rows go
          // through the historical section above and don't show this UI.
          const hasPayments = r.status === 'PENDING' && r.remainingAmount !== r.amount;
          const isOpen = openPayments.has(r.id);
          return (
            <li key={r.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-3">
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
                        r.type === 'DEBT'
                          ? 'text-destructive'
                          : 'text-green-700 dark:text-green-400',
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
                    {formatDate(r.date, dateFormat)}
                    {r.description ? ` · ${r.description}` : ''}
                  </p>
                  {hasPayments && (
                    <button
                      type="button"
                      onClick={() => togglePayments(r.id)}
                      className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      aria-expanded={isOpen}
                    >
                      {isOpen ? (
                        <ChevronDown className="size-3.5" aria-hidden />
                      ) : (
                        <ChevronRight className="size-3.5" aria-hidden />
                      )}
                      {isOpen ? tPayments('hide') : tPayments('show')}
                    </button>
                  )}
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
              </div>
              {hasPayments && isOpen && (
                <DebtLoanPaymentsList debtId={r.id} fallbackCurrency={r.currency} />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
