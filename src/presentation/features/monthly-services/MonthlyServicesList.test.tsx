import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type MonthlyService } from '@/core/domain/entities/monthly-service';

import { TestProviders } from '@/test/utils';

import { MonthlyServicesList } from './MonthlyServicesList';

const mockServices: MonthlyService[] = [
  {
    id: 'svc-1',
    userId: 'user-1',
    name: 'Luz',
    defaultAccountId: 'acc-1',
    categoryId: 'cat-1',
    currency: 'PEN',
    frequencyMonths: 1,
    estimatedAmount: 120,
    dueDay: 15,
    startPeriod: '2026-01',
    lastPaidPeriod: null,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    nextDuePeriod: '2026-04',
    isOverdue: false,
    isPaidForCurrentMonth: false,
  },
  {
    id: 'svc-2',
    userId: 'user-1',
    name: 'Internet',
    defaultAccountId: 'acc-1',
    categoryId: 'cat-1',
    currency: 'PEN',
    frequencyMonths: 1,
    estimatedAmount: 80,
    dueDay: 5,
    startPeriod: '2026-01',
    lastPaidPeriod: '2026-04',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    nextDuePeriod: '2026-05',
    isOverdue: false,
    isPaidForCurrentMonth: true,
  },
];

const mockUseMonthlyServices = vi.fn();

interface MockQueryResult {
  data: MonthlyService[] | undefined;
  isLoading: boolean;
}

vi.mock('@/core/application/hooks/use-monthly-services', () => ({
  useMonthlyServices: (includeArchived: boolean): MockQueryResult =>
    mockUseMonthlyServices(includeArchived) as MockQueryResult,
  useArchiveMonthlyService: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteMonthlyService: () => ({ mutate: vi.fn(), isPending: false }),
  useSkipMonthlyServiceMonth: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateMonthlyService: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateMonthlyService: () => ({ mutate: vi.fn(), isPending: false }),
  usePayMonthlyService: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/core/application/hooks/use-accounts', () => ({
  useAccounts: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/core/application/hooks/use-categories', () => ({
  useCategories: () => ({ data: [], isLoading: false }),
}));

function renderList() {
  return render(<MonthlyServicesList />, { wrapper: TestProviders });
}

describe('MonthlyServicesList', () => {
  beforeEach(() => {
    mockUseMonthlyServices.mockReset();
  });

  it('renders loading skeletons when loading', () => {
    mockUseMonthlyServices.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = renderList();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(3);
  });

  it('renders the empty state when there are no services', () => {
    mockUseMonthlyServices.mockReturnValue({ data: [], isLoading: false });
    renderList();
    expect(screen.getByText(/todavía no agregaste ningún servicio/i)).toBeInTheDocument();
  });

  it('renders all services as cards', () => {
    mockUseMonthlyServices.mockReturnValue({ data: mockServices, isLoading: false });
    renderList();
    expect(screen.getByText('Luz')).toBeInTheDocument();
    expect(screen.getByText('Internet')).toBeInTheDocument();
  });

  it('renders the page title and create CTA', () => {
    mockUseMonthlyServices.mockReturnValue({ data: mockServices, isLoading: false });
    renderList();
    expect(screen.getByText(/servicios mensuales/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /nuevo servicio/i }).length).toBeGreaterThan(0);
  });
});
