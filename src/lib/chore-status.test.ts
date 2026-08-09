import { describe, expect, it } from 'vitest';

import { type ChoreCadence, getChoreStatus, upcomingWindowDays } from './chore-status';

const WEEKLY: ChoreCadence = { intervalValue: 1, intervalUnit: 'weeks' };
const MONTHLY: ChoreCadence = { intervalValue: 1, intervalUnit: 'months' };
const QUARTERLY: ChoreCadence = { intervalValue: 3, intervalUnit: 'months' };

describe('upcomingWindowDays', () => {
  // The window is cadence ÷ 7, clamped to [1, 7]. A fixed 7-day window meant a
  // weekly chore was "upcoming" for its entire life — the label carried no
  // information. Scaling it keeps "upcoming" meaning the same thing (the last
  // ~1/7 of the cycle) whatever the cadence.
  it.each<[string, ChoreCadence, number]>([
    ['daily', { intervalValue: 1, intervalUnit: 'days' }, 1],
    ['every 3 days', { intervalValue: 3, intervalUnit: 'days' }, 1],
    ['weekly', { intervalValue: 1, intervalUnit: 'weeks' }, 1],
    ['fortnightly', { intervalValue: 2, intervalUnit: 'weeks' }, 2],
    ['monthly', { intervalValue: 1, intervalUnit: 'months' }, 4],
    ['quarterly', { intervalValue: 3, intervalUnit: 'months' }, 7],
    ['yearly', { intervalValue: 1, intervalUnit: 'years' }, 7],
  ])('%s → %d day(s)', (_label, cadence, expected) => {
    expect(upcomingWindowDays(cadence)).toBe(expected);
  });

  it('never returns 0, however short the cadence', () => {
    // Otherwise a daily chore would jump straight from horizon to today and
    // the amber chip would be unreachable.
    expect(upcomingWindowDays({ intervalValue: 1, intervalUnit: 'days' })).toBeGreaterThanOrEqual(
      1,
    );
  });

  it('caps at 7 so a yearly chore is not "upcoming" for two months', () => {
    expect(upcomingWindowDays({ intervalValue: 10, intervalUnit: 'years' })).toBe(7);
  });
});

describe('getChoreStatus', () => {
  describe('today', () => {
    it('returns "today" when nextDueDate is today', () => {
      // Was "upcoming" before this change. Due today is its own state now: it
      // is the one the user can act on right now, and it drives the
      // chore-due-today alert on the backend.
      expect(getChoreStatus('2026-04-15', '2026-04-15', WEEKLY)).toBe('today');
      expect(getChoreStatus('2026-04-15', '2026-04-15', MONTHLY)).toBe('today');
    });

    it('is "today" regardless of cadence — the window never swallows it', () => {
      expect(getChoreStatus('2026-04-15', '2026-04-15', QUARTERLY)).toBe('today');
    });
  });

  describe('overdue', () => {
    it('returns "overdue" one day past due', () => {
      expect(getChoreStatus('2026-04-14', '2026-04-15', WEEKLY)).toBe('overdue');
    });

    it('returns "overdue" many days past due', () => {
      expect(getChoreStatus('2026-01-01', '2026-04-15', MONTHLY)).toBe('overdue');
    });

    it('handles month boundaries', () => {
      expect(getChoreStatus('2026-04-30', '2026-05-01', WEEKLY)).toBe('overdue');
    });

    it('handles year boundaries', () => {
      expect(getChoreStatus('2025-12-31', '2026-01-01', WEEKLY)).toBe('overdue');
    });
  });

  describe('weekly — the case that prompted the change', () => {
    it('is "upcoming" only the day before', () => {
      expect(getChoreStatus('2026-04-16', '2026-04-15', WEEKLY)).toBe('upcoming');
    });

    it('is already "horizon" two days out, where it used to be upcoming', () => {
      // The bug: with a fixed 7-day window a weekly chore was upcoming every
      // single day of its cycle except the one it was done on.
      expect(getChoreStatus('2026-04-17', '2026-04-15', WEEKLY)).toBe('horizon');
      expect(getChoreStatus('2026-04-20', '2026-04-15', WEEKLY)).toBe('horizon');
    });
  });

  describe('monthly', () => {
    it('is "upcoming" within 4 days', () => {
      expect(getChoreStatus('2026-04-19', '2026-04-15', MONTHLY)).toBe('upcoming');
    });

    it('is "horizon" 5 days out', () => {
      expect(getChoreStatus('2026-04-20', '2026-04-15', MONTHLY)).toBe('horizon');
    });
  });

  describe('quarterly', () => {
    it('keeps the full 7-day window', () => {
      expect(getChoreStatus('2026-04-22', '2026-04-15', QUARTERLY)).toBe('upcoming');
      expect(getChoreStatus('2026-04-23', '2026-04-15', QUARTERLY)).toBe('horizon');
    });
  });

  describe('defensive', () => {
    it('falls back to "horizon" on malformed dates rather than throwing', () => {
      expect(getChoreStatus('invalid', '2026-04-15', WEEKLY)).toBe('horizon');
      expect(getChoreStatus('2026-04-15', 'invalid', WEEKLY)).toBe('horizon');
    });

    it('treats a non-positive interval as the shortest window instead of dividing by nothing', () => {
      expect(
        getChoreStatus('2026-04-16', '2026-04-15', { intervalValue: 0, intervalUnit: 'weeks' }),
      ).toBe('upcoming');
    });
  });
});
