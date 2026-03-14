import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type HabitWithStats } from '@/core/domain/entities/habit';

import { TestProviders } from '@/test/utils';

import { HabitList } from './HabitList';

const mockHabits: HabitWithStats[] = [
  {
    id: '1',
    userId: 'user-1',
    name: 'Tomar agua',
    description: null,
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
  },
  {
    id: '2',
    userId: 'user-1',
    name: 'Meditar',
    description: null,
    frequency: 'DAILY',
    targetCount: 1,
    color: '#9C27B0',
    icon: 'brain',
    isArchived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    currentStreak: 3,
    longestStreak: 10,
    completionRate: 0.6,
    periodCount: 0,
    periodCompleted: false,
    todayLog: null,
  },
];

const mockLogMutate = vi.fn();
const mockArchiveMutate = vi.fn();
const mockDeleteMutate = vi.fn();

vi.mock('@/core/application/hooks/use-habits', () => ({
  useDailyHabits: () => ({ data: mockHabits, isLoading: false }),
  useHabits: () => ({ data: mockHabits, isLoading: false }),
  useLogHabit: () => ({ mutate: mockLogMutate, isPending: false }),
  useArchiveHabit: () => ({ mutate: mockArchiveMutate, isPending: false }),
  useDeleteHabit: () => ({ mutate: mockDeleteMutate, isPending: false }),
  useCreateHabit: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateHabit: () => ({ mutate: vi.fn(), isPending: false }),
}));

function renderList() {
  return render(<HabitList />, { wrapper: TestProviders });
}

describe('HabitList', () => {
  beforeEach(() => {
    mockLogMutate.mockClear();
    mockArchiveMutate.mockClear();
    mockDeleteMutate.mockClear();
  });

  it('renders page title', () => {
    renderList();
    expect(screen.getByText(/hábitos/i)).toBeInTheDocument();
  });

  it('renders all habit cards', () => {
    renderList();
    expect(screen.getByText('Tomar agua')).toBeInTheDocument();
    expect(screen.getByText('Meditar')).toBeInTheDocument();
  });

  it('shows create button', () => {
    renderList();
    expect(screen.getByText(/nuevo hábito/i)).toBeInTheDocument();
  });

  it('shows toggle archived button', () => {
    renderList();
    const buttons = screen.getAllByRole('button');
    const archiveToggle = buttons.find((b) => b.getAttribute('title'));
    expect(archiveToggle).toBeInTheDocument();
  });

  it('calls onCheckIn when habit check-in clicked', async () => {
    const user = userEvent.setup();
    renderList();
    const checkInButtons = screen.getAllByRole('button', { name: /registrar/i });
    await user.click(checkInButtons[0]);
    expect(mockLogMutate).toHaveBeenCalled();
  });

  it('links habits to detail pages', () => {
    renderList();
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '/habits/1');
    expect(links[1]).toHaveAttribute('href', '/habits/2');
  });
});
