import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type HabitWithStats } from '@/core/domain/entities/habit';

import { TestProviders } from '@/test/utils';

import { HabitPipView } from './HabitPipView';

const habit = {
  id: 'h1',
  userId: 'u1',
  name: 'Leer',
  description: null,
  frequency: 'DAILY',
  targetCount: 1,
  color: null,
  icon: null,
  isArchived: false,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  currentStreak: 3,
  longestStreak: 5,
  completionRate: 0.5,
  todayLog: null,
  periodCount: 0,
  periodCompleted: false,
  periodTarget: 1,
  rescuableDate: null,
  periodRescued: false,
  rescuedDates: [],
} as unknown as HabitWithStats;

const mockLogMutate = vi.fn();
vi.mock('@/core/application/hooks/use-habits', () => ({
  useHabit: () => ({ data: habit, isLoading: false }),
  useLogHabit: () => ({ mutate: mockLogMutate, isPending: false }),
  useRescueStreak: () => ({ mutate: vi.fn(), isPending: false }),
  useReleaseRescue: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('@/core/application/hooks/use-habits-window-sync', () => ({
  useHabitsWindowSync: () => undefined,
}));
vi.mock('@/core/application/hooks/use-user-settings', () => ({
  useStreakShields: () => 1,
  useDateFormat: () => 'DD/MM/YYYY',
}));
// Tauri is not present in jsdom; these are the window calls the view makes.
vi.mock('@/lib/pip-window', () => ({
  closeSelfPip: vi.fn(),
  resizeSelfPip: vi.fn(),
  canUsePip: () => false,
}));
vi.mock('@/lib/beep', () => ({ playBeep: vi.fn() }));

function renderPip() {
  return render(<HabitPipView habitId="h1" />, { wrapper: TestProviders });
}

/** Opens the bottom bar that reveals the timer. */
function openTimer() {
  fireEvent.click(screen.getByRole('button', { name: /cronómetro/i }));
}

describe('HabitPipView timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockLogMutate.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('always renders mm:ss, never a bare digit', () => {
    // The bug this replaces showed `15:0` — a number input cannot display a
    // leading zero, so the seconds slot dropped its padding.
    renderPip();
    openTimer();

    expect(screen.getByLabelText('min')).toHaveValue('10');
    expect(screen.getByLabelText('seg')).toHaveValue('00');

    fireEvent.change(screen.getByLabelText('seg'), { target: { value: '5' } });
    expect(screen.getByLabelText('seg')).toHaveValue('05');
  });

  it('keeps the last two digits typed, like a clock field', () => {
    renderPip();
    openTimer();

    const seconds = screen.getByLabelText('seg');
    fireEvent.change(seconds, { target: { value: '053' } });

    expect(seconds).toHaveValue('53');
  });

  it('refuses anything that is not a digit, and clamps to the maximum', () => {
    renderPip();
    openTimer();

    const seconds = screen.getByLabelText('seg');
    fireEvent.change(seconds, { target: { value: 'ab' } });
    expect(seconds).toHaveValue('00');

    // 99 seconds is not a second count — it clamps rather than rolling over.
    fireEvent.change(seconds, { target: { value: '99' } });
    expect(seconds).toHaveValue('59');
  });

  it('returns to the editable state when it reaches zero', () => {
    // It used to park on 00:00 with no way out: reset only renders while the
    // clock runs, so the field was dead until the window was closed.
    renderPip();
    openTimer();

    fireEvent.change(screen.getByLabelText('min'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('seg'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /iniciar/i }));

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    // Editable again, with the duration still armed for another round.
    expect(screen.getByLabelText('min')).toHaveValue('00');
    expect(screen.getByLabelText('seg')).toHaveValue('01');
    expect(screen.getByRole('button', { name: /iniciar/i })).toBeEnabled();
  });

  it('logs nothing when the countdown ends', () => {
    renderPip();
    openTimer();

    fireEvent.change(screen.getByLabelText('min'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('seg'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /iniciar/i }));

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(mockLogMutate).not.toHaveBeenCalled();
  });
});

describe('HabitPipView opacity', () => {
  it('cycles through the dim levels and wraps around', () => {
    // Tauri has no window-opacity API, so this is CSS alpha over a window
    // created transparent. A cycling button beats a slider at 340px wide.
    const { container } = render(<HabitPipView habitId="h1" />, { wrapper: TestProviders });
    const root = container.firstElementChild as HTMLElement;
    const button = screen.getByRole('button', { name: /opacidad/i });

    expect(root.style.opacity).toBe('1');
    fireEvent.click(button);
    expect(root.style.opacity).toBe('0.7');
    fireEvent.click(button);
    expect(root.style.opacity).toBe('0.4');
    fireEvent.click(button);
    expect(root.style.opacity).toBe('1');
  });

  it('goes solid while the pointer is on it', () => {
    // Dimming helps while the window is being ignored. Reaching for it means
    // wanting to read and click it.
    const { container } = render(<HabitPipView habitId="h1" />, { wrapper: TestProviders });
    const root = container.firstElementChild as HTMLElement;

    fireEvent.click(screen.getByRole('button', { name: /opacidad/i }));
    expect(root.style.opacity).toBe('0.7');

    fireEvent.mouseEnter(root);
    expect(root.style.opacity).toBe('1');

    fireEvent.mouseLeave(root);
    expect(root.style.opacity).toBe('0.7');
  });
});
