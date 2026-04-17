import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type HabitWithStats } from '@/core/domain/entities/habit';

import { TestProviders } from '@/test/utils';

import { HabitDetail } from './HabitDetail';

const mockHabit: HabitWithStats = {
  id: '1',
  userId: 'user-1',
  name: 'Tomar agua',
  description: 'Beber 8 vasos al día',
  frequency: 'DAILY',
  targetCount: 8,
  color: '#2196F3',
  icon: 'water',
  isArchived: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  currentStreak: 5,
  longestStreak: 15,
  completionRate: 0.8,
  periodCount: 6,
  periodCompleted: false,
  todayLog: {
    id: 'log-1',
    habitId: '1',
    date: '2026-03-13',
    count: 6,
    completed: false,
    note: null,
    createdAt: '2026-03-13T10:00:00.000Z',
    updatedAt: '2026-03-13T10:00:00.000Z',
  },
};

const mockLogs = [
  {
    id: 'log-1',
    habitId: '1',
    date: '2026-03-13',
    count: 6,
    completed: false,
    note: null,
    createdAt: '2026-03-13T10:00:00.000Z',
    updatedAt: '2026-03-13T10:00:00.000Z',
  },
  {
    id: 'log-2',
    habitId: '1',
    date: '2026-03-12',
    count: 8,
    completed: true,
    note: 'Buen día',
    createdAt: '2026-03-12T10:00:00.000Z',
    updatedAt: '2026-03-12T10:00:00.000Z',
  },
];

const mockLogMutate = vi.fn();
const mockDeleteMutate = vi.fn();
const mockArchiveMutate = vi.fn();

const mockRouterBack = vi.fn();
const mockRouterReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mockRouterBack, replace: mockRouterReplace }),
}));

vi.mock('@/core/application/hooks/use-habits', () => ({
  useHabit: () => ({ data: mockHabit, isLoading: false }),
  useHabitLogs: () => ({
    data: { data: mockLogs, meta: { page: 1, totalPages: 1, total: 2, limit: 30 } },
  }),
  useLogHabit: () => ({ mutate: mockLogMutate, isPending: false }),
  useDeleteHabit: () => ({ mutate: mockDeleteMutate, isPending: false }),
  useArchiveHabit: () => ({ mutate: mockArchiveMutate, isPending: false }),
  useCreateHabit: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateHabit: () => ({ mutate: vi.fn(), isPending: false }),
}));

function renderDetail(habitId = '1') {
  return render(<HabitDetail habitId={habitId} />, { wrapper: TestProviders });
}

describe('HabitDetail', () => {
  beforeEach(() => {
    mockLogMutate.mockClear();
    mockDeleteMutate.mockClear();
    mockArchiveMutate.mockClear();
    mockRouterBack.mockClear();
  });

  it('renders habit name', () => {
    renderDetail();
    expect(screen.getByText('Tomar agua')).toBeInTheDocument();
  });

  it('renders habit description', () => {
    renderDetail();
    expect(screen.getByText(/Beber 8 vasos al día/)).toBeInTheDocument();
  });

  it('displays today progress', () => {
    renderDetail();
    const progressElements = screen.getAllByText(/\/8/);
    expect(progressElements.length).toBeGreaterThan(0);
  });

  it('displays current streak', () => {
    renderDetail();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('displays longest streak', () => {
    renderDetail();
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('displays completion rate', () => {
    renderDetail();
    expect(screen.getByText('80')).toBeInTheDocument();
  });

  it('shows check-in button', () => {
    renderDetail();
    const checkInButton = screen.getByRole('button', { name: /registrar/i });
    expect(checkInButton).toBeInTheDocument();
  });

  it('calls logMutation when check-in clicked', async () => {
    const user = userEvent.setup();
    renderDetail();
    await user.click(screen.getByRole('button', { name: /registrar/i }));
    expect(mockLogMutate).toHaveBeenCalled();
  });

  it('shows back button', () => {
    renderDetail();
    expect(screen.getByText(/volver/i)).toBeInTheDocument();
  });

  it('navigates back when back button clicked', async () => {
    const user = userEvent.setup();
    renderDetail();
    await user.click(screen.getByText(/volver/i));
    expect(mockRouterBack).toHaveBeenCalledOnce();
  });

  it('shows edit, archive, and delete buttons', () => {
    renderDetail();
    expect(screen.getByText(/editar/i)).toBeInTheDocument();
    expect(screen.getByText(/archivar/i)).toBeInTheDocument();
    expect(screen.getByText(/eliminar/i)).toBeInTheDocument();
  });

  it('calls archive mutation when archive clicked', async () => {
    const user = userEvent.setup();
    renderDetail();
    await user.click(screen.getByText(/archivar/i));
    expect(mockArchiveMutate).toHaveBeenCalledWith('1');
  });

  it('renders the heatmap with the Historial heading', () => {
    renderDetail();
    // HabitDetail passes the fetched logs to HabitHeatmap instead of rendering
    // them as a text list. Detailed heatmap behavior (cells, tooltips, colors)
    // is covered by HabitHeatmap.test.tsx and the Playwright heatmap spec.
    expect(screen.getByText('Historial')).toBeInTheDocument();
  });
});
