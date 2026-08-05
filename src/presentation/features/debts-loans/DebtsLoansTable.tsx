'use client';

import { type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { ArrowDownLeft, ArrowUpRight, ChevronRight, HandCoins } from 'lucide-react';

import { type DebtLoanSummaryRow, type DebtLoanType } from '@/core/domain/entities/debt-loan';

import { DataTable, type DataTableColumn } from '@/presentation/components/ui/DataTable';
import { type RowAction } from '@/presentation/components/ui/RowActionsMenu';
import { TableRowActions } from '@/presentation/components/ui/TableRowActions';

import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

interface DebtsLoansTableProps {
  rows: DebtLoanSummaryRow[];
  /** Open the settle modal for a row (same handler the cards use). */
  onSettle: (row: DebtLoanSummaryRow) => void;
  /** Quick-create a debt/loan prefilled for this person (same as the cards). */
  onQuickAdd: (row: DebtLoanSummaryRow, type: DebtLoanType) => void;
  /** Open the `(reference, currency)` detail modal (row click on the cards). */
  onRowClick: (row: DebtLoanSummaryRow) => void;
}

function rowKey(row: DebtLoanSummaryRow): string {
  return `${row.reference}-${row.currency}`;
}

/**
 * Table view of the Debts/Loans summary — the WAVE 1 reference application of
 * the shared `DataTable` primitive. It shows every field the summary card
 * shows (person, currency, pending debt, pending loan, net) plus an actions
 * column that reuses the card's exact handlers (settle, quick-add ↗/↙, open
 * detail), so behavior is identical between the cards and the table.
 *
 * Not generic itself: this is the module-specific column config. WAVE 2 builds
 * one of these per module (Monthly Services, Chores, ...) on top of the same
 * `DataTable`.
 */
export function DebtsLoansTable({ rows, onSettle, onQuickAdd, onRowClick }: DebtsLoansTableProps) {
  const t = useTranslations('debts');

  function renderNet(row: DebtLoanSummaryRow): ReactNode {
    const amount = Math.abs(row.netOwed);
    if (amount === 0) return <span className="text-muted-foreground">—</span>;
    const inYourFavor = row.netOwed > 0;
    return (
      <span
        className={cn(
          'font-semibold',
          inYourFavor ? 'text-green-700 dark:text-green-400' : 'text-destructive',
        )}
      >
        {inYourFavor ? '+' : '-'}
        {formatCurrency(amount, row.currency)}
      </span>
    );
  }

  const columns: DataTableColumn<DebtLoanSummaryRow>[] = [
    {
      key: 'person',
      header: t('table.person'),
      render: (row) => <span className="font-medium">{row.displayName}</span>,
    },
    {
      key: 'currency',
      header: t('table.currency'),
      render: (row) => <span className="text-muted-foreground">{row.currency}</span>,
    },
    {
      key: 'pendingDebt',
      header: t('table.pendingDebt'),
      align: 'right',
      render: (row) =>
        row.pendingDebt > 0 ? (
          <span className="font-medium text-destructive">
            {formatCurrency(row.pendingDebt, row.currency)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'pendingLoan',
      header: t('table.pendingLoan'),
      align: 'right',
      render: (row) =>
        row.pendingLoan > 0 ? (
          <span className="font-medium text-green-700 dark:text-green-400">
            {formatCurrency(row.pendingLoan, row.currency)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'net',
      header: t('table.net'),
      align: 'right',
      render: renderNet,
    },
    {
      key: 'actions',
      header: t('table.actions'),
      align: 'right',
      render: (row) => {
        const hasAny = row.pendingDebt > 0 || row.pendingLoan > 0;
        const actions: RowAction[] = [];
        if (hasAny) {
          actions.push({
            id: 'settle',
            label: t('summary.settle'),
            icon: HandCoins,
            onClick: () => onSettle(row),
          });
        }
        actions.push(
          {
            id: 'quick-debt',
            label: t('summary.quickAdd.newDebt', { name: row.displayName }),
            icon: ArrowUpRight,
            onClick: () => onQuickAdd(row, 'DEBT'),
          },
          {
            id: 'quick-loan',
            label: t('summary.quickAdd.newLoan', { name: row.displayName }),
            icon: ArrowDownLeft,
            onClick: () => onQuickAdd(row, 'LOAN'),
          },
          {
            id: 'detail',
            label: t('table.openDetail', { name: row.displayName }),
            icon: ChevronRight,
            onClick: () => onRowClick(row),
          },
        );
        return <TableRowActions actions={actions} triggerLabel={t('table.actions')} />;
      },
    },
  ];

  return <DataTable columns={columns} rows={rows} getRowKey={rowKey} onRowClick={onRowClick} />;
}
