import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { type HabitWithStats } from '@/core/domain/entities/habit';

import { TestProviders } from '@/test/utils';

import { HabitCard } from './HabitCard';

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
  periodTarget: 8,
  todayLog: {
    id: 'log-1',
    habitId: '1',
    date: '2026-03-13',
    count: 6,
    completed: false,
    targetCount: 8,
    note: null,
    createdAt: '2026-03-13T10:00:00.000Z',
    updatedAt: '2026-03-13T10:00:00.000Z',
  },
};

function renderCard(habit = mockHabit, overrides = {}) {
  const defaultProps = {
    habit,
    onCheckIn: vi.fn(),
    onUndo: vi.fn(),
    onEdit: vi.fn(),
    onArchive: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };

  return {
    ...render(<HabitCard {...defaultProps} />, { wrapper: TestProviders }),
    ...defaultProps,
  };
}

describe('HabitCard', () => {
  describe('per-day target', () => {
    it('fires onTargetChange with the new target for the day', async () => {
      const user = userEvent.setup();
      const onTargetChange = vi.fn();
      renderCard(mockHabit, { onTargetChange });

      await user.click(screen.getByRole('button', { name: 'Objetivo del día' }));
      await user.click(screen.getByRole('button', { name: /aumentar/i }));

      expect(onTargetChange).toHaveBeenCalledWith(mockHabit, 9);
    });

    it('is not editable for a WEEKLY habit — the objective belongs to the week', () => {
      renderCard({ ...mockHabit, frequency: 'WEEKLY' as const }, { onTargetChange: vi.fn() });
      expect(screen.queryByRole('button', { name: 'Objetivo del día' })).not.toBeInTheDocument();
      expect(screen.getByTestId('habit-progress')).toHaveTextContent('6/8');
    });

    it('is not editable for an archived habit', () => {
      renderCard({ ...mockHabit, isArchived: true }, { onTargetChange: vi.fn() });
      expect(screen.queryByRole('button', { name: 'Objetivo del día' })).not.toBeInTheDocument();
    });

    it('is not editable when no handler is wired', () => {
      renderCard();
      expect(screen.queryByRole('button', { name: 'Objetivo del día' })).not.toBeInTheDocument();
    });
  });

  it('renders habit name and frequency', () => {
    renderCard();
    expect(screen.getByText('Tomar agua')).toBeInTheDocument();
    expect(screen.getByText('Diario')).toBeInTheDocument();
  });

  it('displays today progress count', () => {
    renderCard();
    expect(screen.getByTestId('habit-progress')).toHaveTextContent('6/8');
  });

  it('displays current streak', () => {
    renderCard();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows plus button when not completed', () => {
    renderCard();
    const checkInButton = screen.getByRole('button', { name: /registrar/i });
    expect(checkInButton).toBeInTheDocument();
  });

  it('shows check icon when completed', () => {
    const completedHabit = {
      ...mockHabit,
      todayLog: { ...mockHabit.todayLog!, count: 8, completed: true },
    };
    renderCard(completedHabit);
    const checkInButton = screen.getByRole('button', { name: /registrar/i });
    expect(checkInButton).toBeInTheDocument();
  });

  it('calls onCheckIn when check-in button clicked', async () => {
    const { onCheckIn } = renderCard();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /registrar/i }));
    expect(onCheckIn).toHaveBeenCalledWith(mockHabit);
  });

  it('does not show check-in button when archived', () => {
    const archivedHabit = { ...mockHabit, isArchived: true };
    renderCard(archivedHabit);
    expect(screen.queryByRole('button', { name: /registrar/i })).not.toBeInTheDocument();
  });

  it('shows 0/target when no todayLog', () => {
    // Also reset periodCount — HabitCard renders `{periodCount}/{periodTarget}`,
    // not `{todayLog.count}/{targetCount}`, so leaving the mock's periodCount=6
    // would render '6/8' even when todayLog is null.
    const noLogHabit = { ...mockHabit, todayLog: null, periodCount: 0 };
    renderCard(noLogHabit);
    expect(screen.getByTestId('habit-progress')).toHaveTextContent('0/8');
  });

  it('links to habit detail page', () => {
    renderCard();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/habits/1');
  });
});
