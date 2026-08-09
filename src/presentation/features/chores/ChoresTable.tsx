'use client';

import { useTranslations } from 'next-intl';

import { Archive, ArchiveRestore, Check, History, Pencil, SkipForward, Trash2 } from 'lucide-react';

import { useDateFormat } from '@/core/application/hooks/use-user-settings';
import { type Chore } from '@/core/domain/entities/chore';

import { DataTable, type DataTableColumn } from '@/presentation/components/ui/DataTable';
import { type RowAction } from '@/presentation/components/ui/RowActionsMenu';
import { TableRowActions } from '@/presentation/components/ui/TableRowActions';

import { type ChoreStatus, getChoreStatus } from '@/lib/chore-status';
import { formatDate, getTodayLocaleDate } from '@/lib/format';
import { cn } from '@/lib/utils';

interface ChoresTableProps {
  chores: Chore[];
  /** Open the "mark done" flow for a chore (same handler the cards use). */
  onMarkDone: (chore: Chore) => void;
  /** Skip the current cycle for a chore (same handler the cards use). */
  onSkip: (chore: Chore) => void;
  /** Open the logs history for a chore (same handler the cards use). */
  onViewHistory: (chore: Chore) => void;
  /** Open the edit form for a chore (same handler the cards use). */
  onEdit: (chore: Chore) => void;
  /** Archive / unarchive a chore (same handler the cards use). */
  onArchive: (chore: Chore) => void;
  /** Delete a chore (same handler the cards use). */
  onDelete: (chore: Chore) => void;
}

const STATUS_CLASSES: Record<ChoreStatus, string> = {
  overdue: 'bg-destructive/15 text-destructive',
  today: 'bg-primary/15 text-primary',
  upcoming: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  horizon: 'bg-muted text-muted-foreground',
};

/**
 * Table view of the chores list. Built on the shared `DataTable` primitive and
 * wired to the EXACT handlers the cards use (`onMarkDone`, `onSkip`,
 * `onViewHistory`, `onEdit`, `onArchive`, `onDelete`), so the table exposes the
 * SAME per-chore actions the card does.
 */
export function ChoresTable({
  chores,
  onMarkDone,
  onSkip,
  onViewHistory,
  onEdit,
  onArchive,
  onDelete,
}: ChoresTableProps) {
  const t = useTranslations('chores');
  const dateFormat = useDateFormat();
  const today = getTodayLocaleDate();

  const columns: DataTableColumn<Chore>[] = [
    {
      key: 'name',
      header: t('table.name'),
      render: (chore) => <span className="font-medium">{chore.name}</span>,
    },
    {
      key: 'category',
      header: t('table.category'),
      render: (chore) =>
        chore.category ? (
          <span className="text-muted-foreground">{chore.category}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'cadence',
      header: t('table.cadence'),
      render: (chore) => (
        <span className="text-muted-foreground">
          {t('intervalLabel', {
            value: chore.intervalValue,
            unit: t(`intervalUnit.${chore.intervalUnit}`, { value: chore.intervalValue }),
          })}
        </span>
      ),
    },
    {
      key: 'nextDue',
      header: t('table.nextDue'),
      render: (chore) => (
        <span className="tabular-nums">{formatDate(chore.nextDueDate, dateFormat)}</span>
      ),
    },
    {
      key: 'lastDone',
      header: t('table.lastDone'),
      render: (chore) => (
        <span className="tabular-nums text-muted-foreground">
          {chore.lastDoneDate ? formatDate(chore.lastDoneDate, dateFormat) : t('lastDoneNever')}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('table.status'),
      render: (chore) => {
        const isArchived = !chore.isActive;
        const status = getChoreStatus(chore.nextDueDate, today, chore);
        return (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
              isArchived ? 'bg-muted text-muted-foreground' : STATUS_CLASSES[status],
            )}
          >
            {isArchived ? t('archived') : t(`status.${status}`)}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: t('table.actions'),
      align: 'right',
      render: (chore) => {
        const isArchived = !chore.isActive;
        const actions: RowAction[] = [];
        if (!isArchived) {
          actions.push(
            { id: 'done', label: t('actions.done'), icon: Check, onClick: () => onMarkDone(chore) },
            {
              id: 'skip',
              label: t('actions.skip'),
              icon: SkipForward,
              onClick: () => onSkip(chore),
            },
          );
        }
        actions.push({
          id: 'history',
          label: t('actions.viewHistory'),
          icon: History,
          onClick: () => onViewHistory(chore),
        });
        if (!isArchived) {
          actions.push({
            id: 'edit',
            label: t('actions.edit'),
            icon: Pencil,
            onClick: () => onEdit(chore),
          });
        }
        actions.push(
          {
            id: 'archive',
            label: isArchived ? t('actions.unarchive') : t('actions.archive'),
            icon: isArchived ? ArchiveRestore : Archive,
            onClick: () => onArchive(chore),
          },
          {
            id: 'delete',
            label: t('actions.delete'),
            icon: Trash2,
            onClick: () => onDelete(chore),
            destructive: true,
          },
        );
        return <TableRowActions actions={actions} triggerLabel={t('table.actions')} />;
      },
    },
  ];

  return <DataTable columns={columns} rows={chores} getRowKey={(chore) => chore.id} />;
}
