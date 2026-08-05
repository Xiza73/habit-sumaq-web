import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type MonthlyService } from '@/core/domain/entities/monthly-service';

import { TestProviders } from '@/test/utils';

import { MonthlyServicesList } from './MonthlyServicesList';

const mockServices: MonthlyService[] = [
  {
    id: 'svc-1',
    userId: 'user-1',
    name: 'Luz',
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
    paidAmountForCurrentMonth: 0,
    linkedDebts: [],
  },
  {
    id: 'svc-2',
    userId: 'user-1',
    name: 'Internet',
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
    paidAmountForCurrentMonth: 80,
    linkedDebts: [],
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
}));

// v1.0.0 (Phase A6-W.2): PayMonthlyServiceForm now calls the new
// `useCreateMonthlyServicePayment` hook instead of the legacy
// `usePayMonthlyService`. Mounted by this list inside <PayMonthlyServiceForm>.
vi.mock('@/core/application/hooks/use-monthly-service-payments', () => ({
  useCreateMonthlyServicePayment: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/core/application/hooks/use-categories', () => ({
  useCategories: () => ({ data: [], isLoading: false }),
}));

// Controllable view prefs so a test can drive a non-default sort order and
// assert the table's row order follows it (regression: the table used to
// receive the RAW unsorted list, so toggling reshuffled the rows).
const { mockPrefsRef } = vi.hoisted(() => ({
  // Plain object literal: the property types widen to `string`, so a later
  // test can reassign `orderBy: 'dueDay'` etc. without a cast.
  mockPrefsRef: { current: { groupBy: 'none', orderBy: 'name', orderDir: 'asc' } },
}));
vi.mock('@/core/application/hooks/use-monthly-services-view-prefs', () => ({
  useMonthlyServicesViewPrefs: () => ({ prefs: mockPrefsRef.current, setPrefs: vi.fn() }),
}));

function renderList() {
  return render(<MonthlyServicesList />, { wrapper: TestProviders });
}

describe('MonthlyServicesList', () => {
  beforeEach(() => {
    mockUseMonthlyServices.mockReset();
    // The view-mode toggle persists per-device; reset so each test starts on cards.
    window.localStorage.clear();
    // Reset view prefs to the default (name, ascending) between tests.
    mockPrefsRef.current = { groupBy: 'none', orderBy: 'name', orderDir: 'asc' };
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

  it('renders cards by default and switches to the table view when toggled', async () => {
    const user = userEvent.setup();
    mockUseMonthlyServices.mockReturnValue({ data: mockServices, isLoading: false });
    renderList();

    // Default view = cards, so there is no table yet.
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /tabla/i }));

    // Table view now renders, with the localized headers and one row per service.
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Nombre' })).toBeInTheDocument();
    expect(screen.getByText('Luz')).toBeInTheDocument();
    expect(screen.getByText('Internet')).toBeInTheDocument();
  });

  it('renders the table rows in the active sort order, not the raw data order', async () => {
    const user = userEvent.setup();
    // Raw data order is [Luz (dueDay 15), Internet (dueDay 5)]. A non-default
    // sort of dueDay ascending must reorder the TABLE to [Internet, Luz] —
    // proving the table receives the sorted list, not the raw one.
    mockPrefsRef.current = { groupBy: 'none', orderBy: 'dueDay', orderDir: 'asc' };
    mockUseMonthlyServices.mockReturnValue({ data: mockServices, isLoading: false });
    renderList();

    await user.click(screen.getByRole('button', { name: /tabla/i }));
    const table = await screen.findByRole('table');

    const dataRows = within(table)
      .getAllByRole('row')
      // Drop the header row (it has columnheaders, not cells).
      .filter((row) => within(row).queryAllByRole('cell').length > 0);
    const orderedNames = dataRows.map((row) => within(row).getAllByRole('cell')[0].textContent);

    // dueDay ascending → Internet (5) before Luz (15), reversing the raw order.
    expect(orderedNames).toEqual(['Internet', 'Luz']);
  });
});
