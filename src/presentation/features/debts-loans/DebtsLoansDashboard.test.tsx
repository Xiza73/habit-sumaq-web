import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type DebtLoanSummaryRow } from '@/core/domain/entities/debt-loan';

import { debtsLoansApi } from '@/infrastructure/api/debts-loans.api';

import { TestProviders } from '@/test/utils';

import { DebtsLoansDashboard } from './DebtsLoansDashboard';

vi.mock('@/infrastructure/api/debts-loans.api', () => ({
  debtsLoansApi: {
    list: vi.fn(),
    summary: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    settle: vi.fn(),
    bulkSettleByReference: vi.fn().mockResolvedValue({
      settledCount: 1,
      totalSettledAmount: 100,
      currency: 'PEN',
      settledIds: ['x'],
    }),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

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

function renderDashboard() {
  return render(
    <TestProviders>
      <DebtsLoansDashboard />
    </TestProviders>,
  );
}

describe('DebtsLoansDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the empty state when the summary returns no rows', async () => {
    vi.mocked(debtsLoansApi.summary).mockResolvedValueOnce([]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/Nothing pending|Nada pendente|Nada pendiente/i)).toBeInTheDocument();
    });
  });

  it('renders one summary card per (reference, currency) group', async () => {
    vi.mocked(debtsLoansApi.summary).mockResolvedValueOnce([
      makeRow({ displayName: 'Juan', currency: 'PEN' }),
      makeRow({ displayName: 'Juan', currency: 'USD', pendingLoan: 300, netOwed: 300 }),
      makeRow({
        displayName: 'Pedro',
        currency: 'PEN',
        pendingDebt: 0,
        pendingLoan: 100,
        netOwed: 100,
      }),
    ]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getAllByText('Juan')).toHaveLength(2);
      expect(screen.getByText('Pedro')).toBeInTheDocument();
    });
  });

  it('opens the bulk-settle modal when a card requests it, and fires the API on confirm', async () => {
    const user = userEvent.setup();
    vi.mocked(debtsLoansApi.summary).mockResolvedValueOnce([
      makeRow({
        displayName: 'Juan',
        currency: 'PEN',
        pendingDebt: 300,
        pendingLoan: 0,
        netOwed: -300,
      }),
    ]);

    renderDashboard();

    // Wait until the row has rendered. The "Juan" text comes from the card body.
    await screen.findByText('Juan');

    // Click the "Settle all" button (locale-dependent text).
    const settleAll = await screen.findByRole('button', {
      name: /Settle all|Liquidar todo|Liquidar tudo/i,
    });
    await user.click(settleAll);

    // Modal opens — find the Confirm button and click it.
    const confirm = await screen.findByRole('button', { name: /^Confirm$|^Confirmar$/i });
    await user.click(confirm);

    await waitFor(() => {
      expect(debtsLoansApi.bulkSettleByReference).toHaveBeenCalledWith(
        expect.objectContaining({ reference: 'Juan', currency: 'PEN' }),
      );
    });
  });

  it('switches the status filter from pending to all and re-fetches', async () => {
    const user = userEvent.setup();
    vi.mocked(debtsLoansApi.summary).mockResolvedValue([]);

    renderDashboard();

    // Wait for first fetch (pending).
    await waitFor(() => expect(debtsLoansApi.summary).toHaveBeenCalledWith('pending'));

    const allButton = screen.getByRole('button', { name: /^All$|^Todos$/i });
    await user.click(allButton);

    await waitFor(() => expect(debtsLoansApi.summary).toHaveBeenCalledWith('all'));
  });
});
