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
  // BudgetMovementList (rendered when a budget exists) now consumes
  // `useDateFormat` to honor the user's date-format preference. Tests
  // don't assert on the rendered date string, so the safe default is fine.
  useDateFormat: () => 'YYYY-MM-DD',
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
}));

vi.mock('@/core/application/hooks/use-categories', () => ({
  useCategories: () => ({ data: [], isLoading: false }),
  // BudgetMovementForm now mounts CategorySelectField in the edit modal,
  // which depends on these two hooks even when the form is closed (see
  // CategoryForm: it runs its mutation hooks on render regardless of `open`).
  useCreateCategory: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateCategory: () => ({ mutate: vi.fn(), isPending: false }),
}));

// v1.0.0 (Phase A6-W.1): the dashboard reads movements from the new
// `/budget-movements` endpoint via `useBudgetMovements`, and the form +
// list mutate through `useCreateBudgetMovement` / `useUpdateBudgetMovement`
// / `useDeleteBudgetMovement`. The legacy `useAccounts` + `useTransactions`
// dependencies are gone.
vi.mock('@/core/application/hooks/use-budget-movements', () => ({
  useBudgetMovements: () => ({ data: [], isLoading: false }),
  useCreateBudgetMovement: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateBudgetMovement: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteBudgetMovement: () => ({ mutate: vi.fn(), isPending: false }),
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
  initialDailyAllowance: 66.67,
  recovery: { zeroSpendDays: 0, halfSpendDays: 0 },
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

    // h2 inside EmptyBudgetCta carries the "no tienes presupuesto" copy.
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/no tienes presupuesto/i);
    expect(screen.getByRole('button', { name: /crear presupuesto/i })).toBeInTheDocument();
  });

  it('renders the KPI card when a current budget exists', () => {
    currentBudgetData = populatedBudget;
    render(<BudgetDashboard />, { wrapper: TestProviders });

    // KPI card: the active-budget layout headlines "Disponible hoy". The
    // older assertion looked for `600 gastado de 2000`, but that copy now
    // lives inside the collapsed breakdown — checking for the locked-day
    // headline label is the stable signal that the card mounted.
    expect(screen.getByText(/disponible hoy/i)).toBeInTheDocument();
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
