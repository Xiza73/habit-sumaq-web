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
  rescuableDate: null,
  periodRescued: false,
  rescuedDates: [],
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

describe('HabitCard — streak shield rescue', () => {
  const rescuable: HabitWithStats = { ...mockHabit, rescuableDate: '2026-03-12' };

  it('offers the rescue when a period is rescuable and the user has a shield', () => {
    renderCard(rescuable, { onRescueStreak: vi.fn(), streakShields: 1 });

    const button = screen.getByRole('button', { name: /rescatar racha/i });
    expect(button).toBeEnabled();
  });

  it('fires onRescueStreak with the habit', async () => {
    const user = userEvent.setup();
    const onRescueStreak = vi.fn();
    renderCard(rescuable, { onRescueStreak, streakShields: 2 });

    await user.click(screen.getByRole('button', { name: /rescatar racha/i }));

    expect(onRescueStreak).toHaveBeenCalledWith(rescuable);
  });

  // Deliberate: this is the one teachable moment for the mechanic — a streak
  // is actually at risk right now. Hiding it until the user happens to hold a
  // shield AND have a gap means most people never learn the feature exists.
  it('still shows the row at zero shields, disabled and explaining why', () => {
    renderCard(rescuable, { onRescueStreak: vi.fn(), streakShields: 0 });

    const button = screen.getByRole('button', { name: /sin escudos/i });
    expect(button).toBeDisabled();
  });

  it('shows nothing when there is no period to rescue', () => {
    renderCard(
      { ...mockHabit, rescuableDate: null },
      {
        onRescueStreak: vi.fn(),
        streakShields: 2,
      },
    );

    expect(
      screen.queryByRole('button', { name: /rescatar racha|sin escudos/i }),
    ).not.toBeInTheDocument();
  });

  it('shows nothing on an archived habit', () => {
    renderCard(
      { ...rescuable, isArchived: true },
      {
        onRescueStreak: vi.fn(),
        streakShields: 2,
      },
    );

    expect(
      screen.queryByRole('button', { name: /rescatar racha|sin escudos/i }),
    ).not.toBeInTheDocument();
  });

  it('shows nothing on a read-only surface that passes no handler', () => {
    renderCard(rescuable, { streakShields: 2 });

    expect(
      screen.queryByRole('button', { name: /rescatar racha|sin escudos/i }),
    ).not.toBeInTheDocument();
  });
});

describe('HabitCard — a rescued period', () => {
  const rescued: HabitWithStats = { ...mockHabit, periodRescued: true, periodCount: 0 };

  it('offers release instead of a check-in', async () => {
    // The whole bug: the day looked ordinary, so the user logged over their
    // own shield and burned it on a period that no longer needed protecting.
    const onCheckIn = vi.fn();
    const onReleaseRescue = vi.fn();
    const user = userEvent.setup();
    renderCard(rescued, { onCheckIn, onReleaseRescue });

    expect(screen.queryByRole('button', { name: /marcar/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /protegido por un escudo/i }));

    expect(onReleaseRescue).toHaveBeenCalledWith(rescued);
    expect(onCheckIn).not.toHaveBeenCalled();
  });

  it('keeps the plain check-in when the period is not rescued', () => {
    renderCard({ ...mockHabit, periodRescued: false }, { onReleaseRescue: vi.fn() });

    expect(
      screen.queryByRole('button', { name: /protegido por un escudo/i }),
    ).not.toBeInTheDocument();
  });
});

describe('HabitCard - overflow menu', () => {
  it('shows the menu when there are administrative actions', () => {
    renderCard(mockHabit);
    expect(screen.getByRole('button', { name: /habit actions/i })).toBeInTheDocument();
  });

  it('drops the menu entirely when none are given', () => {
    // The floating window passes none. A menu whose every entry is a no-op is
    // worse than no menu, and dropping it leaves the close button in the
    // corner where the hand already goes.
    renderCard(mockHabit, { onEdit: undefined, onArchive: undefined, onDelete: undefined });

    expect(screen.queryByRole('button', { name: /habit actions/i })).not.toBeInTheDocument();
  });
});

describe('HabitCard - detail link', () => {
  it('links to the detail by default', () => {
    renderCard(mockHabit);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/habits/1');
  });

  it('drops the link when asked, keeping the same content', () => {
    // The popup needs this twice over: clicking the card would navigate a
    // chrome-less 340px window to a full page with no way back, and Tauri
    // refuses to start a window drag from inside an <a>.
    renderCard(mockHabit, { disableDetailLink: true });

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText(mockHabit.name)).toBeInTheDocument();
  });
});

describe('HabitCard - floating window button', () => {
  it('offers to open the popup when the handler is given', async () => {
    const user = userEvent.setup();
    const onOpenPip = vi.fn();
    renderCard(mockHabit, { onOpenPip });

    await user.click(screen.getByRole('button', { name: /abrir en ventana flotante/i }));

    expect(onOpenPip).toHaveBeenCalledWith(mockHabit);
  });

  it('shows a CLOSE button instead when rendered inside the popup', async () => {
    // Same card, one button swapped. That is the entire difference between
    // the list card and the floating one, and it is why there is no second
    // component to drift from this one.
    const user = userEvent.setup();
    const onClosePip = vi.fn();
    renderCard(mockHabit, { onClosePip });

    expect(
      screen.queryByRole('button', { name: /abrir en ventana flotante/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cerrar ventana flotante/i }));
    expect(onClosePip).toHaveBeenCalled();
  });

  it('renders neither button in the browser, where no handler is passed', () => {
    renderCard(mockHabit);

    expect(screen.queryByRole('button', { name: /ventana flotante/i })).not.toBeInTheDocument();
  });
});
