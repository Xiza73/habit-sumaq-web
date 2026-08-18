'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { Archive, ArchiveRestore, Pencil, Receipt, SkipForward, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { useSettleDebtLoan } from '@/core/application/hooks/use-debts-loans';
import { type Category } from '@/core/domain/entities/category';
import { type LinkedDebt, type MonthlyService } from '@/core/domain/entities/monthly-service';

import { ApiError } from '@/infrastructure/api/api-error';

import { DataTable, type DataTableColumn } from '@/presentation/components/ui/DataTable';
import { type RowAction } from '@/presentation/components/ui/RowActionsMenu';
import { TableRowActions } from '@/presentation/components/ui/TableRowActions';
import { DebtLoanRowSettleModal } from '@/presentation/features/debts-loans/DebtLoanRowSettleModal';

import { formatCurrency, formatPeriodLabel } from '@/lib/format';
import { toSettleableDebtLoan } from '@/lib/monthly-service-linked-debt';
import {
  canPayMonthlyService,
  MONTHLY_SERVICE_STATUS_CLASSES,
  monthlyServiceStatusLabel,
  resolveMonthlyServiceStatus,
} from '@/lib/monthly-service-status';
import { cn } from '@/lib/utils';

interface MonthlyServicesTableProps {
  services: MonthlyService[];
  categoriesById: Map<string, Category>;
  /** Open the pay flow for a service (same handler the cards use). */
  onPay: (service: MonthlyService) => void;
  /** Skip the current period for a service (same handler the cards use). */
  onSkip: (service: MonthlyService) => void;
  /** Open the edit form for a service (same handler the cards use). */
  onEdit: (service: MonthlyService) => void;
  /** Archive / unarchive a service (same handler the cards use). */
  onArchive: (service: MonthlyService) => void;
  /** Delete a service (same handler the cards use). */
  onDelete: (service: MonthlyService) => void;
}

/**
 * Table view of the monthly-services list. Built on the shared `DataTable`
 * primitive and wired to the EXACT handlers the cards use (`onPay`, `onSkip`,
 * `onEdit`, `onArchive`, `onDelete`), so the table exposes the SAME per-service
 * actions the card does — including deleting a service and settling any of its
 * linked debts (the card's per-debt chips), reusing the same settle flow
 * (`useSettleDebtLoan` + `DebtLoanRowSettleModal`) the card manages internally.
 *
 * The list-level toggle in `MonthlyServicesList` renders this when the
 * per-device view mode is `'table'`; grouping is intentionally flattened into
 * a single table (the group headers only exist in the cards view). The rows are
 * already sorted by the caller so the order matches the active sort preference.
 */
export function MonthlyServicesTable({
  services,
  categoriesById,
  onPay,
  onSkip,
  onEdit,
  onArchive,
  onDelete,
}: MonthlyServicesTableProps) {
  const t = useTranslations('monthlyServices');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  // Single settle target for the whole table — mirrors the card's internal
  // `settlingDebt` state, but keyed by `{ debt, service }` so the settle
  // handler can read the owning service's currency.
  const [settling, setSettling] = useState<{ debt: LinkedDebt; service: MonthlyService } | null>(
    null,
  );
  const settleMutation = useSettleDebtLoan();

  function handleSettleConfirm(mode: 'real' | 'informal', amount: number) {
    if (!settling) return;
    settleMutation.mutate(
      {
        id: settling.debt.id,
        data: {
          settledAmount: amount,
          currency: mode === 'real' ? settling.service.currency : undefined,
        },
      },
      {
        onSuccess: () => setSettling(null),
        onError: (error) => {
          toast.error(
            error instanceof ApiError && error.code && tErrors.has(error.code)
              ? tErrors(error.code as 'DBT_001')
              : tErrors('generic'),
          );
        },
      },
    );
  }

  const columns: DataTableColumn<MonthlyService>[] = [
    {
      key: 'name',
      header: t('table.name'),
      render: (service) => <span className="font-medium">{service.name}</span>,
    },
    {
      key: 'category',
      header: t('table.category'),
      render: (service) => {
        const name = categoriesById.get(service.categoryId)?.name;
        return name ? (
          <span className="text-muted-foreground">{name}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      key: 'currency',
      header: t('table.currency'),
      render: (service) => (
        <span className="font-mono text-xs uppercase text-muted-foreground">
          {service.currency}
        </span>
      ),
    },
    {
      key: 'estimatedAmount',
      header: t('table.estimatedAmount'),
      align: 'right',
      render: (service) =>
        service.estimatedAmount != null ? (
          <span className="tabular-nums">
            {formatCurrency(service.estimatedAmount, service.currency)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'dueDay',
      header: t('table.dueDay'),
      align: 'right',
      render: (service) =>
        service.dueDay != null ? (
          <span className="tabular-nums">~{service.dueDay}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'nextPeriod',
      header: t('table.nextPeriod'),
      render: (service) => (
        <span className="text-muted-foreground">
          {formatPeriodLabel(service.nextDuePeriod, locale)}
        </span>
      ),
    },
    {
      key: 'linkedDebts',
      header: t('table.linkedDebts'),
      render: (service) =>
        service.linkedDebts.length === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {service.linkedDebts.map((debt) => (
              <button
                key={debt.id}
                type="button"
                onClick={() => setSettling({ debt, service })}
                aria-label={t('linkedDebts.settleTrigger', { reference: debt.reference })}
                title={t('linkedDebts.settleTrigger', { reference: debt.reference })}
                className="rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {debt.reference} · {formatCurrency(debt.remainingAmount, service.currency)}
              </button>
            ))}
          </div>
        ),
    },
    {
      key: 'status',
      header: t('table.status'),
      render: (service) => {
        const isArchived = !service.isActive;
        const status = resolveMonthlyServiceStatus(service);
        return (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
              isArchived
                ? 'bg-muted text-muted-foreground'
                : MONTHLY_SERVICE_STATUS_CLASSES[status],
            )}
          >
            {isArchived
              ? t('archived')
              : monthlyServiceStatusLabel(
                  status,
                  t,
                  formatPeriodLabel(service.nextDuePeriod, locale),
                )}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: t('table.actions'),
      align: 'right',
      render: (service) => {
        const isArchived = !service.isActive;
        const canPay = canPayMonthlyService(service);
        const actions: RowAction[] = [];
        if (canPay) {
          actions.push(
            { id: 'pay', label: t('actions.pay'), icon: Receipt, onClick: () => onPay(service) },
            {
              id: 'skip',
              label: t('actions.skip'),
              icon: SkipForward,
              onClick: () => onSkip(service),
            },
          );
        }
        if (!isArchived) {
          actions.push({
            id: 'edit',
            label: t('actions.edit'),
            icon: Pencil,
            onClick: () => onEdit(service),
          });
        }
        actions.push(
          {
            id: 'archive',
            label: isArchived ? t('actions.unarchive') : t('actions.archive'),
            icon: isArchived ? ArchiveRestore : Archive,
            onClick: () => onArchive(service),
          },
          {
            id: 'delete',
            label: t('actions.delete'),
            icon: Trash2,
            onClick: () => onDelete(service),
            destructive: true,
          },
        );
        return <TableRowActions actions={actions} triggerLabel={t('table.actions')} />;
      },
    },
  ];

  return (
    <>
      <DataTable columns={columns} rows={services} getRowKey={(service) => service.id} />
      <DebtLoanRowSettleModal
        row={settling ? toSettleableDebtLoan(settling.debt, settling.service) : null}
        loading={settleMutation.isPending}
        onConfirm={handleSettleConfirm}
        onCancel={() => setSettling(null)}
      />
    </>
  );
}
