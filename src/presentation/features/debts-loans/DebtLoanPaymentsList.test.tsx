import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type DebtLoanPayment } from '@/core/domain/entities/debt-loan';

import { debtsLoansApi } from '@/infrastructure/api/debts-loans.api';

import { TestProviders } from '@/test/utils';

import { DebtLoanPaymentsList } from './DebtLoanPaymentsList';

vi.mock('@/infrastructure/api/debts-loans.api', () => ({
  debtsLoansApi: {
    list: vi.fn(),
    summary: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    settle: vi.fn(),
    bulkSettleByReference: vi.fn(),
    listPayments: vi.fn(),
    updatePayment: vi.fn(),
    deletePayment: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function makePayment(overrides: Partial<DebtLoanPayment> = {}): DebtLoanPayment {
  return {
    id: 'p1',
    amount: 50,
    currency: 'PEN',
    note: 'first slice',
    createdAt: '2026-06-10T12:00:00.000Z',
    ...overrides,
  };
}

function renderList(props?: Partial<React.ComponentProps<typeof DebtLoanPaymentsList>>) {
  return render(
    <TestProviders>
      <DebtLoanPaymentsList debtId="debt-1" fallbackCurrency="PEN" {...props} />
    </TestProviders>,
  );
}

describe('DebtLoanPaymentsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders one row per payment with amount and note', async () => {
    vi.mocked(debtsLoansApi.listPayments).mockResolvedValueOnce([
      makePayment({ id: 'p1', amount: 50, note: 'first slice' }),
      makePayment({ id: 'p2', amount: 30, note: 'second slice' }),
    ]);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('first slice')).toBeInTheDocument();
      expect(screen.getByText('second slice')).toBeInTheDocument();
    });
  });

  it('shows an inline edit form when the edit button is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(debtsLoansApi.listPayments).mockResolvedValueOnce([makePayment()]);

    renderList();

    const editButton = await screen.findByRole('button', { name: /editar pago/i });
    await user.click(editButton);

    expect(await screen.findByRole('button', { name: /guardar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
  });

  it('calls the delete mutation after confirmation', async () => {
    const user = userEvent.setup();
    vi.mocked(debtsLoansApi.listPayments).mockResolvedValueOnce([makePayment({ id: 'p-del' })]);
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);

    renderList();

    const deleteButton = await screen.findByRole('button', { name: /eliminar pago/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(debtsLoansApi.deletePayment).toHaveBeenCalledWith('p-del');
    });
  });
});
