import { describe, expect, it } from 'vitest';

import { type MonthlyServicePayment } from '@/core/domain/entities/monthly-service-payment';
import {
  createMonthlyServicePaymentSchema,
  updateMonthlyServicePaymentSchema,
} from '@/core/domain/schemas/monthly-service-payment.schema';

import { findLatestPaidPeriod, monthlyServicePaymentKeys } from './use-monthly-service-payments';

function makePayment(overrides: Partial<MonthlyServicePayment>): MonthlyServicePayment {
  return {
    id: 'p-1',
    userId: 'u-1',
    monthlyServiceId: 's-1',
    currency: 'PEN',
    amount: 50,
    period: '2026-06',
    description: null,
    date: '2026-06-15T12:00:00.000Z',
    createdAt: '2026-06-15T12:00:00.000Z',
    updatedAt: '2026-06-15T12:00:00.000Z',
    ...overrides,
  };
}

describe('monthlyServicePaymentKeys', () => {
  it('roots every key under ["monthly-service-payments"]', () => {
    expect(monthlyServicePaymentKeys.all).toEqual(['monthly-service-payments']);
    expect(monthlyServicePaymentKeys.lists()).toEqual(['monthly-service-payments', 'list']);
    expect(monthlyServicePaymentKeys.details()).toEqual(['monthly-service-payments', 'detail']);
  });

  it('encodes the monthlyServiceId in the list query key', () => {
    expect(monthlyServicePaymentKeys.list('svc-abc')).toEqual([
      'monthly-service-payments',
      'list',
      'svc-abc',
    ]);
  });

  it('keys each detail by id', () => {
    expect(monthlyServicePaymentKeys.detail('p-xyz')).toEqual([
      'monthly-service-payments',
      'detail',
      'p-xyz',
    ]);
  });
});

describe('findLatestPaidPeriod', () => {
  it('returns null for undefined input (initial render)', () => {
    expect(findLatestPaidPeriod(undefined)).toBeNull();
  });

  it('returns null for empty list', () => {
    expect(findLatestPaidPeriod([])).toBeNull();
  });

  it('returns the single period when only one payment exists', () => {
    expect(findLatestPaidPeriod([makePayment({ period: '2026-03' })])).toBe('2026-03');
  });

  it('returns the lexicographically max YYYY-MM period (regardless of input order)', () => {
    const rows = [
      makePayment({ id: 'a', period: '2026-03' }),
      makePayment({ id: 'b', period: '2026-12' }),
      makePayment({ id: 'c', period: '2026-08' }),
    ];
    expect(findLatestPaidPeriod(rows)).toBe('2026-12');
  });

  it('handles year boundaries correctly (YYYY-MM lex order matches chronological)', () => {
    const rows = [
      makePayment({ id: 'a', period: '2025-11' }),
      makePayment({ id: 'b', period: '2026-01' }),
      makePayment({ id: 'c', period: '2025-12' }),
    ];
    expect(findLatestPaidPeriod(rows)).toBe('2026-01');
  });
});

describe('createMonthlyServicePaymentSchema', () => {
  const validBase = {
    monthlyServiceId: '00000000-0000-4000-8000-000000000001',
    period: '2026-06',
    amount: 50,
  };

  it('accepts a minimal valid payload', () => {
    expect(createMonthlyServicePaymentSchema.safeParse(validBase).success).toBe(true);
  });

  it.each(['2026-13', '2026-00', '26-06', '2026/06', '2026-6', 'abc'])(
    'rejects malformed period: %s',
    (period) => {
      const result = createMonthlyServicePaymentSchema.safeParse({
        ...validBase,
        period,
      });
      expect(result.success).toBe(false);
    },
  );

  it('rejects amount = 0 (must be > 0)', () => {
    expect(createMonthlyServicePaymentSchema.safeParse({ ...validBase, amount: 0 }).success).toBe(
      false,
    );
  });

  it('rejects non-uuid monthlyServiceId', () => {
    expect(
      createMonthlyServicePaymentSchema.safeParse({
        ...validBase,
        monthlyServiceId: 'not-a-uuid',
      }).success,
    ).toBe(false);
  });
});

describe('updateMonthlyServicePaymentSchema', () => {
  it('accepts an empty update (all fields optional)', () => {
    expect(updateMonthlyServicePaymentSchema.safeParse({}).success).toBe(true);
  });

  it('accepts amount-only', () => {
    expect(updateMonthlyServicePaymentSchema.safeParse({ amount: 75 }).success).toBe(true);
  });

  it('rejects amount = 0', () => {
    expect(updateMonthlyServicePaymentSchema.safeParse({ amount: 0 }).success).toBe(false);
  });
});
