import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type BudgetWithKpi } from '@/core/domain/entities/budget';

import { TestProviders } from '@/test/utils';

import { BudgetDashboard } from './BudgetDashboard';

// Hoisted mock state — `vi.mock` factory runs before module imports, so we
// drive the mocks via these top-level lets and reassign per test.
let currentBudgetData: BudgetWithKpi | null = null;
let currentBudgetLoading = false;
let allBudgetsData: BudgetWithKpi[] = [];
let lastCurrencyAsked: string | null = null;
let userDefaultCurrency: 'PEN' | 'USD' | 'EUR' = 'PEN';

vi.mock('@/core/application/hooks/use-user-settings', () => ({
  useUserSettings: () => ({
    data: { defaultCurrency: userDefaultCurrency },
    isLoading: false,
  }),
}));

vi.mock('@/core/application/hooks/use-budgets', () => ({
  useCurrentBudget: (currency: 'PEN' | 'USD' | 'EUR') => {
    lastCurrencyAsked = currency;
    return { data: currentBudgetData, isLoading: currentBudgetLoading };
  },
  useBudgets: () => ({ data: allBudgetsData, isLoading: false }),
  useCreateBudget: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateBudget: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteBudget: () => ({ mutate: vi.fn(), isPending: false }),
  useAddBudgetMovement: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/core/application/hooks/use-accounts', () => ({
  useAccounts: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/core/application/hooks/use-categories', () => ({
  useCategories: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/core/application/hooks/use-transactions', () => ({
  useDeleteTransaction: () => ({ mutate: vi.fn(), isPending: false }),
  // The dashboard imports `transactionKeys` indirectly via use-budgets in real
  // code, but the mock above shadows the whole module. This export keeps the
  // symbol present for any consumer that grabs it during render.
  transactionKeys: { all: ['transactions'], lists: () => ['transactions', 'list'] },
}));

const populatedBudget: BudgetWithKpi = {
  id: 'b-1',
  userId: 'user-1',
  year: 2026,
  month: 4,
  currency: 'PEN',
  amount: 2000,
  spent: 600,
  remaining: 1400,
  daysRemainingIncludingToday: 16,
  dailyAllowance: 87.5,
  currentDate: '2026-04-15',
  movements: [],
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
};

describe('BudgetDashboard', () => {
  beforeEach(() => {
    currentBudgetData = null;
    currentBudgetLoading = false;
    allBudgetsData = [];
    lastCurrencyAsked = null;
    userDefaultCurrency = 'PEN';
  });

  it('renders the empty CTA when the user has no budget for the current currency', () => {
    currentBudgetData = null;
    render(<BudgetDashboard />, { wrapper: TestProviders });

    // h2 inside EmptyBudgetCta carries the "no tenés presupuesto" copy.
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/no tenés presupuesto/i);
    expect(screen.getByRole('button', { name: /crear presupuesto/i })).toBeInTheDocument();
  });

  it('renders the KPI card when a current budget exists', () => {
    currentBudgetData = populatedBudget;
    render(<BudgetDashboard />, { wrapper: TestProviders });

    // KPI card: spentOfTotal copy uses the budget amounts.
    expect(screen.getByText(/600[.,]00.*2[.,]?000[.,]00/)).toBeInTheDocument();
    // Movements section heading appears.
    expect(screen.getByRole('heading', { name: /movimientos/i })).toBeInTheDocument();
  });

  it('shows a loading skeleton while the current budget query is pending', () => {
    currentBudgetLoading = true;
    const { container } = render(<BudgetDashboard />, { wrapper: TestProviders });

    // Skeleton has the `animate-pulse` class. We don't bother asserting CTAs
    // / KPIs aren't there — the loading branch returns BEFORE either.
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  it("uses the user's defaultCurrency from settings on first render", () => {
    userDefaultCurrency = 'USD';
    render(<BudgetDashboard />, { wrapper: TestProviders });

    expect(lastCurrencyAsked).toBe('USD');
  });

  it('switches the active currency when the user clicks the currency toggle', async () => {
    const user = userEvent.setup();
    userDefaultCurrency = 'PEN';
    render(<BudgetDashboard />, { wrapper: TestProviders });

    expect(lastCurrencyAsked).toBe('PEN');

    await user.click(screen.getByRole('button', { name: 'EUR' }));

    expect(lastCurrencyAsked).toBe('EUR');
  });
});
