import { createElement, type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type MonthlyServicePayment } from '@/core/domain/entities/monthly-service-payment';
import {
  createMonthlyServicePaymentSchema,
  updateMonthlyServicePaymentSchema,
} from '@/core/domain/schemas/monthly-service-payment.schema';

import { httpClient } from '@/infrastructure/api/http-client';
import { monthlyServicePaymentsApi } from '@/infrastructure/api/monthly-service-payments.api';

import { debtLoanKeys } from './use-debts-loans';
import {
  findLatestPaidPeriod,
  monthlyServicePaymentKeys,
  useCreateMonthlyServicePayment,
  useDeleteMonthlyServicePayment,
} from './use-monthly-service-payments';
import { monthlyServiceKeys } from './use-monthly-services';

vi.mock('@/infrastructure/api/http-client', () => ({
  httpClient: {
    post: vi.fn(),
  },
}));

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

describe('createMonthlyServicePaymentSchema — participants (shared-service splits)', () => {
  const validBase = {
    monthlyServiceId: '00000000-0000-4000-8000-000000000001',
    period: '2026-06',
    amount: 300,
  };

  it('accepts omitted participants (non-shared payment, unchanged behavior)', () => {
    expect(createMonthlyServicePaymentSchema.safeParse(validBase).success).toBe(true);
  });

  it('accepts an empty participants array', () => {
    expect(
      createMonthlyServicePaymentSchema.safeParse({ ...validBase, participants: [] }).success,
    ).toBe(true);
  });

  it('accepts participants with reference, amount and alreadyPaid', () => {
    const result = createMonthlyServicePaymentSchema.safeParse({
      ...validBase,
      participants: [
        { reference: 'Ana', amount: 100, alreadyPaid: false },
        { reference: 'Luis', amount: 80, alreadyPaid: true },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts a participant with alreadyPaid omitted (backend defaults it to false)', () => {
    const result = createMonthlyServicePaymentSchema.safeParse({
      ...validBase,
      participants: [{ reference: 'Ana', amount: 100 }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.participants?.[0].alreadyPaid).toBeUndefined();
    }
  });

  it('rejects a participant with empty reference', () => {
    const result = createMonthlyServicePaymentSchema.safeParse({
      ...validBase,
      participants: [{ reference: '', amount: 100 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a participant with amount = 0', () => {
    const result = createMonthlyServicePaymentSchema.safeParse({
      ...validBase,
      participants: [{ reference: 'Ana', amount: 0 }],
    });
    expect(result.success).toBe(false);
  });
});

describe('monthlyServicePaymentsApi.create — forwards participants[] to the pay endpoint', () => {
  beforeEach(() => {
    vi.mocked(httpClient.post).mockReset();
  });

  it('sends the participants array verbatim in the POST body', async () => {
    const postMock = vi.mocked(httpClient.post);
    postMock.mockResolvedValueOnce({});

    const input = {
      monthlyServiceId: '00000000-0000-4000-8000-000000000001',
      period: '2026-06',
      amount: 300,
      participants: [
        { reference: 'Ana', amount: 100, alreadyPaid: false },
        { reference: 'Luis', amount: 80, alreadyPaid: true },
      ],
    };

    await monthlyServicePaymentsApi.create(input);

    expect(postMock).toHaveBeenCalledWith('/monthly-service-payments', input);
    expect(postMock).toHaveBeenCalledTimes(1);
  });

  it('omits participants entirely for a non-shared payment (unchanged behavior)', async () => {
    const postMock = vi.mocked(httpClient.post);
    postMock.mockResolvedValueOnce({});

    const input = {
      monthlyServiceId: '00000000-0000-4000-8000-000000000001',
      period: '2026-06',
      amount: 50,
    };

    await monthlyServicePaymentsApi.create(input);

    const sentBody = postMock.mock.calls[0][1] as Record<string, unknown>;
    expect(sentBody).not.toHaveProperty('participants');
  });
});

function makePaymentWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return { Wrapper, invalidateSpy };
}

/**
 * Paying a shared service creates LOAN debts and deleting a payment
 * soft-deletes them, so a payment mutation must ALSO refresh the
 * `['debts-loans']` cache (list + summary) alongside the payments and
 * `['monthly-services']` caches — otherwise the Debts/Loans view goes stale.
 */
describe('monthly-service-payment mutations invalidate debts-loans, monthly-services AND payments caches', () => {
  beforeEach(() => {
    vi.spyOn(monthlyServicePaymentsApi, 'create').mockReset();
    vi.spyOn(monthlyServicePaymentsApi, 'delete').mockReset();
  });

  it('useCreateMonthlyServicePayment invalidates payments, monthly-services AND debts-loans on success', async () => {
    vi.spyOn(monthlyServicePaymentsApi, 'create').mockResolvedValueOnce(
      makePayment({ id: 'p-created' }),
    );
    const { Wrapper, invalidateSpy } = makePaymentWrapper();

    const { result } = renderHook(() => useCreateMonthlyServicePayment(), { wrapper: Wrapper });
    result.current.mutate({
      monthlyServiceId: '00000000-0000-4000-8000-000000000001',
      period: '2026-06',
      amount: 50,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: monthlyServicePaymentKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: monthlyServiceKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: debtLoanKeys.all });
  });

  it('useDeleteMonthlyServicePayment invalidates payments, monthly-services AND debts-loans on success', async () => {
    vi.spyOn(monthlyServicePaymentsApi, 'delete').mockResolvedValueOnce(undefined);
    const { Wrapper, invalidateSpy } = makePaymentWrapper();

    const { result } = renderHook(() => useDeleteMonthlyServicePayment(), { wrapper: Wrapper });
    result.current.mutate('p-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: monthlyServicePaymentKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: monthlyServiceKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: debtLoanKeys.all });
  });
});
