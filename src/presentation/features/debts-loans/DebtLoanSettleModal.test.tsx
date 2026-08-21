import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { type DebtLoanSummaryRow } from '@/core/domain/entities/debt-loan';

import { TestProviders } from '@/test/utils';

import { DebtLoanSettleModal } from './DebtLoanSettleModal';

function makeRow(overrides: Partial<DebtLoanSummaryRow>): DebtLoanSummaryRow {
  return {
    reference: 'juan',
    currency: 'PEN',
    displayName: 'Juan',
    pendingDebt: 0,
    pendingLoan: 0,
    netOwed: 0,
    pendingCount: 1,
    settledCount: 0,
    ...overrides,
  };
}

function renderModal(row: DebtLoanSummaryRow, onConfirm = vi.fn()) {
  const onCancel = vi.fn();
  render(
    <TestProviders>
      <DebtLoanSettleModal row={row} loading={false} onConfirm={onConfirm} onCancel={onCancel} />
    </TestProviders>,
  );
  return { onConfirm, onCancel };
}

describe('DebtLoanSettleModal', () => {
  it('locks to DEBT and hides the loan option when only debt is pending', () => {
    renderModal(makeRow({ pendingDebt: 500, pendingLoan: 0, netOwed: -500 }));

    expect(screen.getByText(/Pagar lo que debo/i)).toBeInTheDocument();
    expect(screen.queryByText(/Cobrar lo que me deben/i)).not.toBeInTheDocument();
  });

  it('locks to LOAN and hides the debt option when only loan is pending', () => {
    renderModal(makeRow({ pendingDebt: 0, pendingLoan: 300, netOwed: 300 }));

    expect(screen.getByText(/Cobrar lo que me deben/i)).toBeInTheDocument();
    expect(screen.queryByText(/Pagar lo que debo/i)).not.toBeInTheDocument();
  });

  it('shows both directions and preselects DEBT when both sides are pending', () => {
    renderModal(makeRow({ pendingDebt: 500, pendingLoan: 300, netOwed: -200 }));

    const debtRadio = screen.getByRole('radio', { name: /Pagar lo que debo/i });
    const loanRadio = screen.getByRole('radio', { name: /Cobrar lo que me deben/i });
    expect(debtRadio).toBeInTheDocument();
    expect(loanRadio).toBeInTheDocument();
    expect(debtRadio).toBeChecked();
    expect(loanRadio).not.toBeChecked();
  });

  it('"Todo" fills the amount with the selected direction pending total', async () => {
    const user = userEvent.setup();
    renderModal(makeRow({ pendingDebt: 500, pendingLoan: 0, netOwed: -500 }));

    const amount = screen.getByLabelText(/^Monto$/i);
    await user.clear(amount);
    await user.type(amount, '10');
    expect(amount).toHaveValue(10);

    await user.click(screen.getByRole('button', { name: /^Todo$/i }));
    expect(amount).toHaveValue(500);
  });

  it('switching direction refills the amount with the new direction pending total', async () => {
    const user = userEvent.setup();
    renderModal(makeRow({ pendingDebt: 500, pendingLoan: 300, netOwed: -200 }));

    const amount = screen.getByLabelText(/^Monto$/i);
    expect(amount).toHaveValue(500);

    await user.click(screen.getByRole('radio', { name: /Cobrar lo que me deben/i }));
    expect(amount).toHaveValue(300);
  });

  it('confirms with the DEBT direction, amount and realPayment=true', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderModal(makeRow({ pendingDebt: 500, pendingLoan: 0, netOwed: -500 }));

    const amount = screen.getByLabelText(/^Monto$/i);
    await user.clear(amount);
    await user.type(amount, '200');

    await user.click(screen.getByRole('button', { name: /^Confirmar$/i }));

    expect(onConfirm).toHaveBeenCalledWith({ type: 'DEBT', amount: 200, realPayment: true });
  });

  it('offers no settle-mode choice at all', () => {
    // Settling is always a real payment now. The radio group asked a question
    // with one real answer, and picking the other one silently skipped the
    // currency pool — a setting you could get wrong without noticing.
    renderModal(makeRow({ pendingDebt: 500, pendingLoan: 300, netOwed: -200 }));

    // The DIRECTION radios stay — this row has pending on both sides, so
    // choosing debt vs loan is a real question. What is gone is the mode
    // group: its legend and both of its options.
    expect(screen.queryByText('¿Cómo lo cerrás?')).not.toBeInTheDocument();
    expect(screen.queryByText('Pago real')).not.toBeInTheDocument();
    expect(screen.queryByText('Cierre informal')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('radio')).toHaveLength(2);
  });

  it('still sends realPayment=true with no selector present', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderModal(makeRow({ pendingDebt: 500, pendingLoan: 0, netOwed: -500 }));

    await user.click(screen.getByRole('button', { name: /^Confirmar$/i }));

    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ realPayment: true }));
  });

  it('blocks confirm when the amount exceeds the selected direction pending total', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderModal(makeRow({ pendingDebt: 500, pendingLoan: 0, netOwed: -500 }));

    const amount = screen.getByLabelText(/^Monto$/i);
    await user.clear(amount);
    await user.type(amount, '999');

    await user.click(screen.getByRole('button', { name: /^Confirmar$/i }));

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('blocks confirm for sub-cent amounts below the schema min (0.001)', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderModal(makeRow({ pendingDebt: 500, pendingLoan: 0, netOwed: -500 }));

    const amount = screen.getByLabelText(/^Monto$/i);
    await user.clear(amount);
    await user.type(amount, '0.001');

    await user.click(screen.getByRole('button', { name: /^Confirmar$/i }));

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('accepts the exact pending total via "Todo" then confirms with amount === pending', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderModal(makeRow({ pendingDebt: 500, pendingLoan: 0, netOwed: -500 }));

    const amount = screen.getByLabelText(/^Monto$/i);
    await user.clear(amount);
    await user.type(amount, '10');

    await user.click(screen.getByRole('button', { name: /^Todo$/i }));
    expect(amount).toHaveValue(500);

    await user.click(screen.getByRole('button', { name: /^Confirmar$/i }));

    expect(onConfirm).toHaveBeenCalledWith({ type: 'DEBT', amount: 500, realPayment: true });
  });

  it('renders a "nothing to settle" state (no form) when neither side has pending', () => {
    renderModal(makeRow({ pendingDebt: 0, pendingLoan: 0, netOwed: 0 }));

    expect(screen.getByText(/No hay nada pendiente para liquidar/i)).toBeInTheDocument();
    // The settle form must NOT render: no amount field and no confirm button.
    expect(screen.queryByLabelText(/^Monto$/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Confirmar$/i })).not.toBeInTheDocument();
  });
});
