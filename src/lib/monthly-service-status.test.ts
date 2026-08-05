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
