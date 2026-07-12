import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type HabitWithStats } from '@/core/domain/entities/habit';

import { TestProviders } from '@/test/utils';

import { HabitTimerModal } from './HabitTimerModal';

// jsdom has no Web Audio — stub the end-of-timer beep.
vi.mock('@/lib/beep', () => ({ playBeep: vi.fn() }));

const habit = {
  id: 'h1',
  userId: 'u1',
  name: 'Leer',
  description: null,
  frequency: 'daily',
  targetCount: 1,
  color: null,
  icon: null,
  isArchived: false,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  currentStreak: 0,
  longestStreak: 0,
  completionRate: 0,
  todayLog: null,
  periodCount: 0,
  periodCompleted: false,
} as unknown as HabitWithStats;

describe('HabitTimerModal', () => {
  it('shows a message when there are no habits to time', () => {
    render(<HabitTimerModal open onClose={vi.fn()} habits={[]} />, { wrapper: TestProviders });
    expect(screen.getByText(/no tenés hábitos para cronometrar/i)).toBeInTheDocument();
  });

  it('keeps Start disabled until a habit is chosen', () => {
    render(<HabitTimerModal open onClose={vi.fn()} habits={[habit]} />, { wrapper: TestProviders });

    const start = screen.getByRole('button', { name: /iniciar/i });
    expect(start).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Hábito'), { target: { value: 'h1' } });
    expect(start).toBeEnabled();
  });

  it('adds minutes with the +10 quick-add button', () => {
    render(<HabitTimerModal open onClose={vi.fn()} habits={[habit]} />, { wrapper: TestProviders });

    // Minutes default to 10; +10 → 20.
    const minutesInput = screen.getByLabelText('min');
    expect(minutesInput).toHaveValue(10);
    fireEvent.click(screen.getByRole('button', { name: '+10' }));
    expect(minutesInput).toHaveValue(20);
  });
});
