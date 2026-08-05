import { NextIntlClientProvider } from 'next-intl';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { type DebtLoanSummaryRow } from '@/core/domain/entities/debt-loan';

import messages from '@/i18n/messages/es.json';

import { DebtsLoansTable } from './DebtsLoansTable';

function makeRow(overrides: Partial<DebtLoanSummaryRow>): DebtLoanSummaryRow {
  return {
    reference: 'juan',
    currency: 'PEN',
    displayName: 'Juan',
    pendingDebt: 500,
    pendingLoan: 0,
    netOwed: -500,
    pendingCount: 2,
    settledCount: 0,
    ...overrides,
  };
}

function renderTable(
  rows: DebtLoanSummaryRow[],
  handlers: Partial<Parameters<typeof DebtsLoansTable>[0]> = {},
) {
  const onSettle = vi.fn();
  const onQuickAdd = vi.fn();
  const onRowClick = vi.fn();
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <DebtsLoansTable
        rows={rows}
        onSettle={onSettle}
        onQuickAdd={onQuickAdd}
        onRowClick={onRowClick}
        {...handlers}
      />
    </NextIntlClientProvider>,
  );
  return { onSettle, onQuickAdd, onRowClick };
}

describe('DebtsLoansTable', () => {
  it('renders the localized column headers', () => {
    renderTable([makeRow({})]);
    expect(screen.getByRole('columnheader', { name: 'Persona' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Moneda' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Deuda pendiente' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Préstamo pendiente' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Neto' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Acciones' })).toBeInTheDocument();
  });

  it('renders one row per summary row with the person and currency', () => {
    renderTable([
      makeRow({ displayName: 'Juan', currency: 'PEN' }),
      makeRow({
        reference: 'ana',
        displayName: 'Ana',
        currency: 'USD',
        pendingLoan: 300,
        netOwed: 300,
      }),
    ]);
    expect(screen.getByText('Juan')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
  });

  it('fires onSettle for the row when its settle action is clicked', async () => {
    const user = userEvent.setup();
    const row = makeRow({ displayName: 'Juan', pendingDebt: 300, netOwed: -300 });
    const { onSettle, onRowClick } = renderTable([row]);

    await user.click(screen.getByRole('button', { name: /^Liquidar$/i }));

    expect(onSettle).toHaveBeenCalledWith(row);
    // The action must not bubble up to the row-click detail handler.
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('fires onQuickAdd with DEBT and LOAN from the quick-add actions', async () => {
    const user = userEvent.setup();
    const row = makeRow({ displayName: 'Juan', pendingDebt: 100, pendingLoan: 100, netOwed: 0 });
    const { onQuickAdd, onRowClick } = renderTable([row]);

    await user.click(screen.getByRole('button', { name: /nueva deuda con juan/i }));
    expect(onQuickAdd).toHaveBeenCalledWith(row, 'DEBT');

    await user.click(screen.getByRole('button', { name: /nuevo préstamo con juan/i }));
    expect(onQuickAdd).toHaveBeenCalledWith(row, 'LOAN');

    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('collapses the row actions into a dropdown that fires the right handler', async () => {
    const user = userEvent.setup();
    const row = makeRow({ displayName: 'Juan', pendingDebt: 300, netOwed: -300 });
    const { onSettle, onQuickAdd, onRowClick } = renderTable([row]);

    // Opening the kebab must not bubble to the row-click detail handler.
    await user.click(screen.getByRole('button', { name: 'Acciones' }));
    expect(onRowClick).not.toHaveBeenCalled();

    // The full action set is available as menu items.
    await user.click(screen.getByRole('menuitem', { name: /^Liquidar$/i }));
    expect(onSettle).toHaveBeenCalledWith(row);

    await user.click(screen.getByRole('button', { name: 'Acciones' }));
    await user.click(screen.getByRole('menuitem', { name: /nueva deuda con juan/i }));
    expect(onQuickAdd).toHaveBeenCalledWith(row, 'DEBT');

    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('opens the detail when the row is clicked', async () => {
    const user = userEvent.setup();
    const row = makeRow({ displayName: 'Juan' });
    const { onRowClick } = renderTable([row]);

    await user.click(screen.getByText('Juan'));

    expect(onRowClick).toHaveBeenCalledWith(row);
  });
});
