import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type Chore } from '@/core/domain/entities/chore';

import { TestProviders } from '@/test/utils';

import { ChoresList } from './ChoresList';

// Pin only `Date` (not the timers) so `getTodayLocaleDate()` is deterministic
// while leaving real timers in place — userEvent interactions deadlock under
// fully-faked timers unless every step explicitly advances them.
const FIXED_TODAY = new Date('2026-04-15T12:00:00Z');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: FIXED_TODAY });
});

afterEach(() => {
  vi.useRealTimers();
});

const mockChores: Chore[] = [
  {
    id: 'chore-2',
    userId: 'user-1',
    name: 'Limpiar alacena',
    notes: null,
    category: null,
    intervalValue: 3,
    intervalUnit: 'months',
    startDate: '2026-01-01',
    lastDoneDate: '2026-01-15',
    nextDueDate: '2026-04-30', // later than chore-1
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    isOverdue: false,
  },
  {
    id: 'chore-1',
    userId: 'user-1',
    name: 'Cortar el pelo',
    notes: null,
    category: null,
    intervalValue: 6,
    intervalUnit: 'weeks',
    startDate: '2026-01-01',
    lastDoneDate: null,
    nextDueDate: '2026-04-18', // earlier — should sort first
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    isOverdue: false,
  },
  {
    id: 'chore-3',
    userId: 'user-1',
    name: 'Cambiar filtros',
    notes: null,
    category: null,
    intervalValue: 1,
    intervalUnit: 'years',
    startDate: '2026-01-01',
    lastDoneDate: '2026-01-01',
    nextDueDate: '2027-01-01',
    isActive: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    isOverdue: false,
  },
];

const mockUseChores = vi.fn();

interface MockQueryResult {
  data: Chore[] | undefined;
  isLoading: boolean;
}

vi.mock('@/core/application/hooks/use-chores', () => ({
  useChores: (includeArchived: boolean): MockQueryResult =>
    mockUseChores(includeArchived) as MockQueryResult,
  useArchiveChore: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteChore: () => ({ mutate: vi.fn(), isPending: false }),
  useSkipChoreCycle: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateChore: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateChore: () => ({ mutate: vi.fn(), isPending: false }),
  useMarkChoreDone: () => ({ mutate: vi.fn(), isPending: false }),
  useChoreLogs: () => ({ data: undefined, isLoading: false, isFetching: false }),
}));

function renderList() {
  return render(<ChoresList />, { wrapper: TestProviders });
}

describe('ChoresList', () => {
  beforeEach(() => {
    mockUseChores.mockReset();
  });

  it('renders loading skeletons when loading', () => {
    mockUseChores.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = renderList();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(3);
  });

  it('renders the empty state when there are no active chores', () => {
    mockUseChores.mockReturnValue({ data: [], isLoading: false });
    renderList();
    expect(screen.getByText(/todavía no agregaste ninguna tarea/i)).toBeInTheDocument();
  });

  it('renders the page title and create CTA', () => {
    mockUseChores.mockReturnValue({ data: mockChores, isLoading: false });
    renderList();
    expect(screen.getByText('Quehaceres')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /nueva tarea/i }).length).toBeGreaterThan(0);
  });

  it('renders only active chores in the active tab', () => {
    mockUseChores.mockReturnValue({
      data: mockChores.filter((c) => c.isActive),
      isLoading: false,
    });
    renderList();
    expect(screen.getByText('Cortar el pelo')).toBeInTheDocument();
    expect(screen.getByText('Limpiar alacena')).toBeInTheDocument();
    // Archived chore must not appear in the default tab.
    expect(screen.queryByText('Cambiar filtros')).not.toBeInTheDocument();
  });

  it('sorts chores by nextDueDate ascending (most urgent first)', () => {
    mockUseChores.mockReturnValue({
      data: mockChores.filter((c) => c.isActive),
      isLoading: false,
    });
    renderList();
    // Match exact card titles (rendered as `<p>{name}</p>` in the card body)
    // — the page subtitle also mentions "cortar pelo" and would match a
    // looser regex.
    const cardTitles = screen
      .getAllByText((content) => content === 'Cortar el pelo' || content === 'Limpiar alacena')
      .filter((el) => el.tagName.toLowerCase() === 'p');
    // Cortar el pelo (2026-04-18) must render BEFORE Limpiar alacena (2026-04-30).
    expect(cardTitles[0]).toHaveTextContent('Cortar el pelo');
    expect(cardTitles[1]).toHaveTextContent('Limpiar alacena');
  });

  it('switches to the archived tab and shows archived chores', async () => {
    // First call (active tab) sees only active chores. After clicking Archived,
    // the hook is called with `true` and we return the archived chore.
    mockUseChores.mockImplementation((includeArchived: boolean) =>
      includeArchived
        ? { data: mockChores.filter((c) => !c.isActive), isLoading: false }
        : { data: mockChores.filter((c) => c.isActive), isLoading: false },
    );
    renderList();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /archivadas/i }));

    expect(screen.getByText('Cambiar filtros')).toBeInTheDocument();
    expect(screen.queryByText('Cortar el pelo')).not.toBeInTheDocument();
  });

  it('renders the archived empty state when there are no archived chores', async () => {
    mockUseChores.mockImplementation((includeArchived: boolean) =>
      includeArchived
        ? { data: [], isLoading: false }
        : { data: mockChores.filter((c) => c.isActive), isLoading: false },
    );
    renderList();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /archivadas/i }));

    expect(screen.getByText(/no hay tareas archivadas/i)).toBeInTheDocument();
  });
});
