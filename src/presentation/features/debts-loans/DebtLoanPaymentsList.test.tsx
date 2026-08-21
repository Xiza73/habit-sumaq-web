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
    listPayments: vi.fn(),
    updatePayment: vi.fn(),
    deletePayment: vi.fn().mockResolvedValue(undefined),
  },
}));

// Stub the DatePicker, same shape the budgets and services specs use: the
// real one portals a calendar, and driving react-day-picker through jsdom
// tests that library rather than this component's wiring.
vi.mock('@/presentation/components/ui/DatePicker', () => ({
  DatePicker: (props: { value: string; onChange: (v: string) => void; 'aria-label'?: string }) => (
    <input
      data-testid="date-picker-stub"
      aria-label={props['aria-label']}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
    />
  ),
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
    paidAt: '2026-06-10T12:00:00.000Z',
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

  it('lets the date be edited and sends only paidAt', async () => {
    const user = userEvent.setup();
    vi.mocked(debtsLoansApi.listPayments).mockResolvedValue([makePayment()]);
    vi.mocked(debtsLoansApi.updatePayment).mockResolvedValue(makePayment());
    renderList();

    await user.click(await screen.findByRole('button', { name: /editar pago/i }));
    await user.clear(screen.getByTestId('date-picker-stub'));
    await user.type(screen.getByTestId('date-picker-stub'), '2026-04-12');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(debtsLoansApi.updatePayment).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({ paidAt: expect.stringContaining('2026-04-12') }),
      );
    });
    // Amount and note were untouched, so they are not in the payload — the
    // component only sends what actually changed.
    const sent = vi.mocked(debtsLoansApi.updatePayment).mock.calls[0][1];
    expect(sent).not.toHaveProperty('amount');
    expect(sent).not.toHaveProperty('note');
  });

  it('never sends createdAt', async () => {
    // `createdAt` is the audit record of when the row was written. The date
    // control edits `paidAt`; letting the audit field ride along would defeat
    // the whole reason the two are separate columns.
    const user = userEvent.setup();
    vi.mocked(debtsLoansApi.listPayments).mockResolvedValue([makePayment()]);
    vi.mocked(debtsLoansApi.updatePayment).mockResolvedValue(makePayment());
    renderList();

    await user.click(await screen.findByRole('button', { name: /editar pago/i }));
    await user.clear(screen.getByTestId('date-picker-stub'));
    await user.type(screen.getByTestId('date-picker-stub'), '2026-04-12');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => expect(debtsLoansApi.updatePayment).toHaveBeenCalled());
    expect(vi.mocked(debtsLoansApi.updatePayment).mock.calls[0][1]).not.toHaveProperty('createdAt');
  });

  it('shows the payment date from paidAt, not createdAt', async () => {
    // A backdated payment must read as its real date. Showing createdAt here
    // is exactly the bug: the row would keep claiming the day it was entered.
    vi.mocked(debtsLoansApi.listPayments).mockResolvedValue([
      makePayment({ createdAt: '2026-06-10T12:00:00.000Z', paidAt: '2026-04-02T12:00:00.000Z' }),
    ]);
    renderList();

    expect(await screen.findByText(/2\/4\/2026|4\/2\/2026/)).toBeInTheDocument();
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
