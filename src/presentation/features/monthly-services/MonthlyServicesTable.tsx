'use client';

import { useLocale, useTranslations } from 'next-intl';

import { type Category } from '@/core/domain/entities/category';
import { type MonthlyService } from '@/core/domain/entities/monthly-service';

import { DataTable, type DataTableColumn } from '@/presentation/components/ui/DataTable';

import { formatCurrency, formatPeriodLabel } from '@/lib/format';
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
}

type StatusTone = 'paid' | 'pending' | 'overdue';

function resolveStatus(service: MonthlyService): StatusTone {
  if (service.isOverdue) return 'overdue';
  if (service.isPaidForCurrentMonth) return 'paid';
  return 'pending';
}

const STATUS_CLASSES: Record<StatusTone, string> = {
  paid: 'bg-income/15 text-income',
  pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  overdue: 'bg-destructive/15 text-destructive',
};

/**
 * Table view of the monthly-services list. Built on the shared `DataTable`
 * primitive and wired to the EXACT handlers the cards use (`onPay`, `onSkip`,
 * `onEdit`, `onArchive`), so behavior is identical between the cards and the
 * table. The list-level toggle in `MonthlyServicesList` renders this when the
 * per-device view mode is `'table'`; grouping is intentionally flattened into
 * a single table (the group headers only exist in the cards view).
 */
export function MonthlyServicesTable({
  services,
  categoriesById,
  onPay,
  onSkip,
  onEdit,
  onArchive,
}: MonthlyServicesTableProps) {
  const t = useTranslations('monthlyServices');
  const locale = useLocale();

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
      key: 'status',
      header: t('table.status'),
      render: (service) => {
        const isArchived = !service.isActive;
        const status = resolveStatus(service);
        return (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
              isArchived ? 'bg-muted text-muted-foreground' : STATUS_CLASSES[status],
            )}
          >
            {isArchived
              ? t('archived')
              : status === 'paid'
                ? t('status.paid')
                : status === 'pending'
                  ? t('status.pending')
                  : t('status.overdue', {
                      period: formatPeriodLabel(service.nextDuePeriod, locale),
                    })}
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
        // Mirror the card: paying is only allowed while the service is not
        // already up-to-date for the current month.
        const canPay = !isArchived && resolveStatus(service) !== 'paid';
        return (
          <div className="flex items-center justify-end gap-1">
            {canPay && (
              <>
                <button
                  type="button"
                  onClick={() => onPay(service)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {t('actions.pay')}
                </button>
                <button
                  type="button"
                  onClick={() => onSkip(service)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {t('actions.skip')}
                </button>
              </>
            )}
            {!isArchived && (
              <button
                type="button"
                onClick={() => onEdit(service)}
                className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {t('actions.edit')}
              </button>
            )}
            <button
              type="button"
              onClick={() => onArchive(service)}
              className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {isArchived ? t('actions.unarchive') : t('actions.archive')}
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={services}
      getRowKey={(service) => service.id}
      emptyMessage={t('empty')}
    />
  );
}
