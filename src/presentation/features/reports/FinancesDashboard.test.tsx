import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type FinancesDashboard as FinancesDashboardData } from '@/core/domain/entities/reports';

import { TestProviders } from '@/test/utils';

import { FinancesDashboard } from './FinancesDashboard';

// Drive the hook's return value per test via the shared mock state — mirrors
// the pattern used in QuickTasksList.test.tsx.
const hookState: {
  data: FinancesDashboardData | undefined;
  isLoading: boolean;
  isError: boolean;
} = { data: undefined, isLoading: false, isError: false };

vi.mock('@/core/application/hooks/use-reports', () => ({
  useFinancesDashboard: () => hookState,
}));

function buildData(overrides: Partial<FinancesDashboardData> = {}): FinancesDashboardData {
  return {
    period: 'month',
    range: { from: '2026-04-01T05:00:00.000Z', to: '2026-04-20T15:00:00.000Z' },
    totalBalance: [],
    periodFlow: [],
    topExpenseCategories: [],
    dailyFlow: [],
    pendingDebts: [],
    ...overrides,
  };
}

describe('FinancesDashboard', () => {
  beforeEach(() => {
    hookState.data = undefined;
    hookState.isLoading = false;
    hookState.isError = false;
  });

  it('renders the page header with title + period selector', () => {
    hookState.data = buildData();
    render(<FinancesDashboard />, { wrapper: TestProviders });

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Finanzas');
    // Period selector has 4 buttons.
    expect(screen.getByRole('button', { name: 'Semana' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mes' })).toBeInTheDocument();
  });

  it('shows empty-state copy for each section when the payload is empty', () => {
    hookState.data = buildData();
    render(<FinancesDashboard />, { wrapper: TestProviders });

    expect(screen.getByText(/todavía no tenés cuentas activas/i)).toBeInTheDocument();
    expect(screen.getByText(/sin movimientos en el período/i)).toBeInTheDocument();
    expect(screen.getByText(/sin gastos categorizados en el período/i)).toBeInTheDocument();
    expect(screen.getByText(/todo al día/i)).toBeInTheDocument();
    expect(screen.getByText(/sin movimientos para graficar en el período/i)).toBeInTheDocument();
  });

  it('renders a KPI card per currency in total balance', () => {
    hookState.data = buildData({
      totalBalance: [
        { currency: 'PEN', amount: 1000, accountCount: 2 },
        { currency: 'USD', amount: 500, accountCount: 1 },
      ],
    });
    render(<FinancesDashboard />, { wrapper: TestProviders });

    // Two cards → two subtitles with account counts.
    expect(screen.getByText('2 cuentas')).toBeInTheDocument();
    expect(screen.getByText('1 cuenta')).toBeInTheDocument();
  });

  it('renders income/expense/net triplet per currency in period flow', () => {
    hookState.data = buildData({
      periodFlow: [{ currency: 'PEN', income: 3000, expense: 1800, net: 1200 }],
    });
    render(<FinancesDashboard />, { wrapper: TestProviders });

    // One row with three KPIs — labels from i18n.
    expect(screen.getByText('Ingresos')).toBeInTheDocument();
    expect(screen.getByText('Gastos')).toBeInTheDocument();
    expect(screen.getByText('Neto')).toBeInTheDocument();
  });

  it('renders top expense categories using the BarList', () => {
    hookState.data = buildData({
      topExpenseCategories: [
        {
          categoryId: 'c1',
          name: 'Comida',
          color: '#FF5722',
          currency: 'PEN',
          total: 800,
          percentage: 75,
        },
        {
          categoryId: 'c2',
          name: 'Transporte',
          color: '#2196F3',
          currency: 'PEN',
          total: 200,
          percentage: 25,
        },
      ],
    });
    render(<FinancesDashboard />, { wrapper: TestProviders });

    expect(screen.getByText('Comida')).toBeInTheDocument();
    expect(screen.getByText('Transporte')).toBeInTheDocument();
  });

  it('falls back to "Sin categoría" when a category name is null', () => {
    hookState.data = buildData({
      topExpenseCategories: [
        {
          categoryId: null,
          name: null,
          color: null,
          currency: 'PEN',
          total: 100,
          percentage: 100,
        },
      ],
    });
    render(<FinancesDashboard />, { wrapper: TestProviders });

    expect(screen.getByText('Sin categoría')).toBeInTheDocument();
  });

  it('renders pending debts with per-currency KPI rows', () => {
    hookState.data = buildData({
      pendingDebts: [{ currency: 'PEN', owesYou: 300, youOwe: 120, net: 180 }],
    });
    render(<FinancesDashboard />, { wrapper: TestProviders });

    expect(screen.getByText('Te deben')).toBeInTheDocument();
    expect(screen.getByText('Debes')).toBeInTheDocument();
    // The net line includes the currency in the label.
    expect(screen.getByText(/Neto \(PEN\)/)).toBeInTheDocument();
  });

  it('renders a chart section per currency in daily flow', () => {
    hookState.data = buildData({
      dailyFlow: [
        {
          currency: 'PEN',
          points: [{ date: '2026-04-20', income: 100, expense: 50 }],
        },
        {
          currency: 'USD',
          points: [{ date: '2026-04-20', income: 20, expense: 10 }],
        },
      ],
    });
    const { container } = render(<FinancesDashboard />, { wrapper: TestProviders });

    // One h-64 chart slot per currency (DailyFlowChart ensures this).
    expect(container.querySelectorAll('.h-64')).toHaveLength(2);
  });

  it('shows nothing but the header when loading', () => {
    hookState.isLoading = true;
    hookState.data = undefined;
    render(<FinancesDashboard />, { wrapper: TestProviders });

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    // No section copy should surface while loading.
    expect(screen.queryByText(/todavía no tenés cuentas activas/i)).not.toBeInTheDocument();
  });

  it('shows the error message when the query fails', () => {
    hookState.isError = true;
    hookState.data = undefined;
    render(<FinancesDashboard />, { wrapper: TestProviders });

    expect(screen.getByText(/cargar el reporte/i)).toBeInTheDocument();
  });
});
