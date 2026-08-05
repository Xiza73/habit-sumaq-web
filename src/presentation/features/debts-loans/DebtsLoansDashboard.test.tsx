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
    settleAmountByReference: vi.fn().mockResolvedValue({
      settledCount: 1,
      totalSettledAmount: 300,
      fullySettledCount: 1,
      partiallySettledId: null,
      currency: 'PEN',
      type: 'DEBT',
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

  it('feeds the reference autocomplete with the original casing (displayName), not the lowercased key', async () => {
    const user = userEvent.setup();
    // Persistent mock: the dashboard queries the summary twice (current filter
    // + an "all" pull that feeds the autocomplete) — both must resolve.
    vi.mocked(debtsLoansApi.summary).mockResolvedValue([
      makeRow({ reference: 'juan', displayName: 'Juan', currency: 'PEN' }),
      makeRow({ reference: 'pedro', displayName: 'Pedro', currency: 'PEN' }),
    ]);

    renderDashboard();

    // Open the create form so the <datalist> mounts.
    await user.click(
      await screen.findByRole('button', { name: /nueva deuda|new debt|nova dívida/i }),
    );

    await waitFor(() => {
      const options = Array.from(
        document.querySelectorAll<HTMLOptionElement>('#dl-reference-list option'),
      ).map((o) => o.value);
      expect(options).toContain('Juan');
      expect(options).toContain('Pedro');
      expect(options).not.toContain('juan');
    });
  });

  it('opens the settle modal when a card requests it, and posts a settle-amount body on confirm', async () => {
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

    // Click the card's "Settle" button (locale-dependent text).
    const settle = await screen.findByRole('button', {
      name: /^Settle$|^Liquidar$/i,
    });
    await user.click(settle);

    // Modal opens — the direction is locked to DEBT (only debt is pending) and
    // the amount defaults to the pending total. Confirm (real mode by default).
    const confirm = await screen.findByRole('button', { name: /^Confirm$|^Confirmar$/i });
    await user.click(confirm);

    await waitFor(() => {
      expect(debtsLoansApi.settleAmountByReference).toHaveBeenCalledWith(
        expect.objectContaining({
          reference: 'Juan',
          currency: 'PEN',
          type: 'DEBT',
          amount: 300,
          realPayment: true,
        }),
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
