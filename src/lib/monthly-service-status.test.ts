import { describe, expect, it } from 'vitest';

import { canPayMonthlyService, resolveMonthlyServiceStatus } from './monthly-service-status';

describe('resolveMonthlyServiceStatus', () => {
  it('returns overdue when isOverdue is set (even if also paid)', () => {
    expect(resolveMonthlyServiceStatus({ isOverdue: true, isPaidForCurrentMonth: true })).toBe(
      'overdue',
    );
  });

  it('returns paid when paid for the current month and not overdue', () => {
    expect(resolveMonthlyServiceStatus({ isOverdue: false, isPaidForCurrentMonth: true })).toBe(
      'paid',
    );
  });

  it('returns pending otherwise', () => {
    expect(resolveMonthlyServiceStatus({ isOverdue: false, isPaidForCurrentMonth: false })).toBe(
      'pending',
    );
  });

  describe('today', () => {
    // Services only had paid / pending / overdue, so one due TODAY looked
    // exactly like one due in three weeks — both were "Pendiente". Chores
    // already distinguished this; the two modules should not disagree about
    // what a due-today item looks like.
    const unpaid = { isOverdue: false, isPaidForCurrentMonth: false };

    it('returns today when the due day is the current day of month', () => {
      expect(resolveMonthlyServiceStatus({ ...unpaid, dueDay: 15 }, 15)).toBe('today');
    });

    it('stays pending on any other day of the month', () => {
      expect(resolveMonthlyServiceStatus({ ...unpaid, dueDay: 15 }, 14)).toBe('pending');
      expect(resolveMonthlyServiceStatus({ ...unpaid, dueDay: 15 }, 16)).toBe('pending');
    });

    it('stays pending when the service has no due day at all', () => {
      // `dueDay` is nullable. Without one there is no "today" to speak of, so
      // the service simply stays pending for the whole period.
      expect(resolveMonthlyServiceStatus({ ...unpaid, dueDay: null }, 15)).toBe('pending');
    });

    it('never overrides overdue', () => {
      // A service overdue from an earlier period whose due day happens to be
      // today is still overdue — the older signal is the more urgent one.
      expect(
        resolveMonthlyServiceStatus(
          { isOverdue: true, isPaidForCurrentMonth: false, dueDay: 15 },
          15,
        ),
      ).toBe('overdue');
    });

    it('never overrides paid', () => {
      // Already paid this month: the due day passing again is not a prompt.
      expect(
        resolveMonthlyServiceStatus(
          { isOverdue: false, isPaidForCurrentMonth: true, dueDay: 15 },
          15,
        ),
      ).toBe('paid');
    });

    it('keeps working for callers that do not pass a day', () => {
      // The day defaults to the real one, so existing call sites need no
      // change — they just gain the new state.
      const result = resolveMonthlyServiceStatus({ ...unpaid, dueDay: null });
      expect(result).toBe('pending');
    });
  });
});

describe('canPayMonthlyService', () => {
  it('allows paying a pending active service', () => {
    expect(
      canPayMonthlyService({ isActive: true, isOverdue: false, isPaidForCurrentMonth: false }),
    ).toBe(true);
  });

  it('allows paying an overdue active service', () => {
    expect(
      canPayMonthlyService({ isActive: true, isOverdue: true, isPaidForCurrentMonth: false }),
    ).toBe(true);
  });

  it('forbids paying a service already paid this month', () => {
    expect(
      canPayMonthlyService({ isActive: true, isOverdue: false, isPaidForCurrentMonth: true }),
    ).toBe(false);
  });

  it('forbids paying an archived service', () => {
    expect(
      canPayMonthlyService({ isActive: false, isOverdue: false, isPaidForCurrentMonth: false }),
    ).toBe(false);
  });
});
