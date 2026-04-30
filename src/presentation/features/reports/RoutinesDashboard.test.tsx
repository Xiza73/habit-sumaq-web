import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type RoutinesDashboard as RoutinesDashboardData } from '@/core/domain/entities/reports';

import { TestProviders } from '@/test/utils';

import { RoutinesDashboard } from './RoutinesDashboard';

const hookState: {
  data: RoutinesDashboardData | undefined;
  isLoading: boolean;
  isError: boolean;
} = { data: undefined, isLoading: false, isError: false };

vi.mock('@/core/application/hooks/use-reports', () => ({
  useRoutinesDashboard: () => hookState,
}));

function buildData(overrides: Partial<RoutinesDashboardData> = {}): RoutinesDashboardData {
  return {
    period: 'month',
    range: { from: '2026-04-01T05:00:00.000Z', to: '2026-04-20T15:00:00.000Z' },
    topHabitStreaks: [],
    habitCompletionToday: { completedToday: 0, dueToday: 0, rate: 0 },
    quickTasksToday: { completed: 0, pending: 0, total: 0 },
    ...overrides,
  };
}

describe('RoutinesDashboard', () => {
  beforeEach(() => {
    hookState.data = undefined;
    hookState.isLoading = false;
    hookState.isError = false;
  });

  it('renders the page header with title + period selector', () => {
    hookState.data = buildData();
    render(<RoutinesDashboard />, { wrapper: TestProviders });

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Rutinas');
    expect(screen.getByRole('button', { name: 'Mes' })).toBeInTheDocument();
  });

  it('renders the Today section KPIs even when empty', () => {
    hookState.data = buildData();
    render(<RoutinesDashboard />, { wrapper: TestProviders });

    expect(screen.getByText('Hábitos completados')).toBeInTheDocument();
    expect(screen.getByText('Prioridades completadas')).toBeInTheDocument();
    // Zero-state values for both KPIs.
    expect(screen.getAllByText('0/0')).toHaveLength(2);
  });

  it('shows the habits completion rate and quick-tasks pending subtitle', () => {
    hookState.data = buildData({
      habitCompletionToday: { completedToday: 3, dueToday: 5, rate: 0.6 },
      quickTasksToday: { completed: 2, pending: 1, total: 3 },
    });
    render(<RoutinesDashboard />, { wrapper: TestProviders });

    expect(screen.getByText('3/5')).toBeInTheDocument();
    expect(screen.getByText('2/3')).toBeInTheDocument();
    // 60% rate → "60% de los diarios".
    expect(screen.getByText(/60% de los diarios/i)).toBeInTheDocument();
    expect(screen.getByText('1 pendiente')).toBeInTheDocument();
  });

  it('shows the empty-state copy for streaks when there are none', () => {
    hookState.data = buildData();
    render(<RoutinesDashboard />, { wrapper: TestProviders });

    expect(screen.getByText(/todavía no tienes rachas activas/i)).toBeInTheDocument();
  });

  it('renders one card per habit streak', () => {
    hookState.data = buildData({
      topHabitStreaks: [
        {
          habitId: 'h1',
          name: 'Tomar agua',
          color: '#2196F3',
          frequency: 'DAILY',
          currentStreak: 5,
          longestStreak: 12,
          completionRate: 0.83,
        },
        {
          habitId: 'h2',
          name: 'Meditar',
          color: null,
          frequency: 'DAILY',
          currentStreak: 2,
          longestStreak: 4,
          completionRate: 0.5,
        },
      ],
    });
    render(<RoutinesDashboard />, { wrapper: TestProviders });

    expect(screen.getByText('Tomar agua')).toBeInTheDocument();
    expect(screen.getByText('Meditar')).toBeInTheDocument();
    // Current + best streak values surface as large numbers.
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    // Completion rate copy.
    expect(screen.getByText(/últimos 30 días: 83%/i)).toBeInTheDocument();
  });

  it('hides children when loading', () => {
    hookState.isLoading = true;
    render(<RoutinesDashboard />, { wrapper: TestProviders });

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    // Section headers would be absent while loading.
    expect(screen.queryByText(/hábitos completados/i)).not.toBeInTheDocument();
  });

  it('shows the error fallback when the query fails', () => {
    hookState.isError = true;
    render(<RoutinesDashboard />, { wrapper: TestProviders });

    expect(screen.getByText(/cargar el reporte/i)).toBeInTheDocument();
  });
});
