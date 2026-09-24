import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TestProviders } from '@/test/utils';

import { FocusTimerModal } from './FocusTimerModal';

// jsdom has no Web Audio — stub the end-of-timer beep.
vi.mock('@/lib/beep', () => ({ playBeep: vi.fn() }));

// The whole point of this file: the timer must reach zero WITHOUT writing
// anything. Spying on the log hook is the only way to assert an absence — a
// visual check would pass while a silent mutation fired underneath.
const mockLogMutate = vi.fn();
vi.mock('@/core/application/hooks/use-habits', () => ({
  useLogHabit: () => ({ mutate: mockLogMutate, isPending: false }),
}));

describe('FocusTimerModal', () => {
  it('starts without asking for a habit', () => {
    render(<FocusTimerModal open onClose={vi.fn()} />, { wrapper: TestProviders });

    // It used to require picking one, and Start stayed disabled until you did.
    expect(screen.queryByLabelText('Hábito')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar/i })).toBeEnabled();
  });

  it('adds minutes with the +10 quick-add button', () => {
    render(<FocusTimerModal open onClose={vi.fn()} />, { wrapper: TestProviders });

    // Minutes default to 10; +10 → 20.
    const minutesInput = screen.getByLabelText('min');
    expect(minutesInput).toHaveValue(10);
    fireEvent.click(screen.getByRole('button', { name: '+10' }));
    expect(minutesInput).toHaveValue(20);
  });

  it('refuses to start on a zero duration', () => {
    render(<FocusTimerModal open onClose={vi.fn()} />, { wrapper: TestProviders });

    fireEvent.change(screen.getByLabelText('min'), { target: { value: '0' } });

    expect(screen.getByRole('button', { name: /iniciar/i })).toBeDisabled();
  });

  describe('reaching zero', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      mockLogMutate.mockClear();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('announces the end and logs NOTHING', () => {
      render(<FocusTimerModal open onClose={vi.fn()} />, { wrapper: TestProviders });

      // One second is the shortest run that still exercises the countdown.
      fireEvent.change(screen.getByLabelText('min'), { target: { value: '0' } });
      fireEvent.change(screen.getByLabelText('seg'), { target: { value: '1' } });
      fireEvent.click(screen.getByRole('button', { name: /iniciar/i }));

      act(() => {
        vi.advanceTimersByTime(1500);
      });

      expect(screen.getByText(/se acabó el tiempo/i)).toBeInTheDocument();
      // The old version offered "Marcar como listo" here and wrote a log.
      expect(screen.queryByRole('button', { name: /marcar como listo/i })).not.toBeInTheDocument();
      expect(mockLogMutate).not.toHaveBeenCalled();
    });
  });
});
