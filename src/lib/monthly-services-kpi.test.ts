import { describe, expect, it } from 'vitest';

import { type MonthlyService } from '@/core/domain/entities/monthly-service';

import { buildMonthlyServicesKpis, getKpiProgress } from './monthly-services-kpi';

function makeService(overrides: Partial<MonthlyService> = {}): MonthlyService {
  return {
    id: overrides.id ?? 'svc',
    userId: 'user-1',
    name: 'Service',
    categoryId: 'cat-1',
    currency: 'PEN',
    frequencyMonths: 1,
    estimatedAmount: 50,
    dueDay: 15,
    startPeriod: '2026-01',
    lastPaidPeriod: null,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    nextDuePeriod: '2026-05',
    isOverdue: false,
    isPaidForCurrentMonth: false,
    paidAmountForCurrentMonth: 0,
    ...overrides,
  };
}

const CURRENT_PERIOD = '2026-05';

describe('buildMonthlyServicesKpis', () => {
  it('returns an empty list when there are no services', () => {
    expect(buildMonthlyServicesKpis([], CURRENT_PERIOD)).toEqual([]);
  });

  it('buckets services by currency and sums paid + estimated separately', () => {
    const services = [
      makeService({
        id: 'p1',
        currency: 'PEN',
        estimatedAmount: 50,
        paidAmountForCurrentMonth: 35,
      }),
      makeService({ id: 'p2', currency: 'PEN', estimatedAmount: 80, paidAmountForCurrentMonth: 0 }),
      makeService({
        id: 'u1',
        currency: 'USD',
        estimatedAmount: 10,
        paidAmountForCurrentMonth: 10,
      }),
    ];

    const result = buildMonthlyServicesKpis(services, CURRENT_PERIOD);

    expect(result).toEqual([
      {
        currency: 'PEN',
        paid: 35,
        estimated: 130,
        servicesInScope: 2,
        servicesWithoutEstimate: 0,
      },
      {
        currency: 'USD',
        paid: 10,
        estimated: 10,
        servicesInScope: 1,
        servicesWithoutEstimate: 0,
      },
    ]);
  });

  it('excludes overdue-from-past-month services (they have their own counter)', () => {
    // `nextDuePeriod` < currentPeriod → overdue. The service is active but
    // its bill is from an older month. Including it here would inflate the
    // current-month KPI with months the user has already lived through.
    const overdue = makeService({
      id: 'overdue',
      nextDuePeriod: '2026-03',
      isOverdue: true,
      estimatedAmount: 100,
      paidAmountForCurrentMonth: 0,
    });

    const result = buildMonthlyServicesKpis([overdue], CURRENT_PERIOD);
    expect(result).toEqual([]);
  });

  it('excludes services that are not due this month (quarterly cadence)', () => {
    // Quarterly service whose next due period is a future quarter — not part
    // of THIS month's spend.
    const quarterlyFuture = makeService({
      id: 'q',
      currency: 'PEN',
      frequencyMonths: 3,
      nextDuePeriod: '2026-07',
      estimatedAmount: 300,
    });

    expect(buildMonthlyServicesKpis([quarterlyFuture], CURRENT_PERIOD)).toEqual([]);
  });

  it('excludes archived (inactive) services', () => {
    const archived = makeService({
      id: 'arc',
      isActive: false,
      estimatedAmount: 50,
      isPaidForCurrentMonth: true,
    });

    expect(buildMonthlyServicesKpis([archived], CURRENT_PERIOD)).toEqual([]);
  });

  it('excludes skipped services (Al día but with paidAmountForCurrentMonth=0)', () => {
    // Repro of the "Estimado is too high" UX issue: skipping a service
    // advances `lastPaidPeriod` so it shows as "Al día", but no transaction
    // is created, so `paidAmountForCurrentMonth` stays at 0. Without this
    // exclusion the `Estimado` total would include a bill that will never
    // happen, making the Pagado/Estimado ratio misleading.
    const skipped = makeService({
      id: 'skipped',
      currency: 'PEN',
      estimatedAmount: 50,
      paidAmountForCurrentMonth: 0,
      isPaidForCurrentMonth: true,
      nextDuePeriod: '2026-06',
    });

    expect(buildMonthlyServicesKpis([skipped], CURRENT_PERIOD)).toEqual([]);
  });

  it('excludes services with a future startPeriod (Al día but not yet billable)', () => {
    // A service whose first billing period is in the future shows up as
    // "Al día" because `nextDuePeriod > currentPeriod`, but it hasn't been
    // paid for real (no transaction yet). Same rule as the skipped case
    // catches it.
    const future = makeService({
      id: 'future',
      currency: 'PEN',
      estimatedAmount: 50,
      paidAmountForCurrentMonth: 0,
      isPaidForCurrentMonth: true,
      nextDuePeriod: '2026-08',
      startPeriod: '2026-08',
    });

    expect(buildMonthlyServicesKpis([future], CURRENT_PERIOD)).toEqual([]);
  });

  it('mixes skipped and paid services correctly (skipped does NOT inflate Estimado)', () => {
    // Smoke test of the user-reported scenario: 3 services all "Al día" but
    // only one was actually paid for real. The Estimado bucket reflects only
    // the service that will produce real spend this month.
    const services = [
      makeService({
        id: 'paid',
        estimatedAmount: 150,
        paidAmountForCurrentMonth: 150,
        isPaidForCurrentMonth: true,
        nextDuePeriod: '2026-06',
      }),
      makeService({
        id: 'skipped',
        estimatedAmount: 80,
        paidAmountForCurrentMonth: 0,
        isPaidForCurrentMonth: true,
        nextDuePeriod: '2026-06',
      }),
      makeService({
        id: 'future-start',
        estimatedAmount: 146,
        paidAmountForCurrentMonth: 0,
        isPaidForCurrentMonth: true,
        nextDuePeriod: '2026-07',
      }),
    ];

    const [kpi] = buildMonthlyServicesKpis(services, CURRENT_PERIOD);
    expect(kpi.paid).toBe(150);
    expect(kpi.estimated).toBe(150);
    expect(kpi.servicesInScope).toBe(1);
  });

  it('includes services already paid this month (drives the "Pagado" total)', () => {
    // After paying, the backend sets nextDuePeriod to NEXT month — so the
    // "due this month" check fails. `isPaidForCurrentMonth` is what keeps
    // the service in scope so its real paid amount counts toward the bucket.
    const paid = makeService({
      currency: 'PEN',
      estimatedAmount: 45,
      paidAmountForCurrentMonth: 45,
      isPaidForCurrentMonth: true,
      nextDuePeriod: '2026-06',
    });

    const [kpi] = buildMonthlyServicesKpis([paid], CURRENT_PERIOD);
    expect(kpi.paid).toBe(45);
    expect(kpi.estimated).toBe(45);
    expect(kpi.servicesInScope).toBe(1);
  });

  it('counts services without estimatedAmount separately (excluded from estimated total)', () => {
    const services = [
      makeService({ id: 'a', estimatedAmount: 50, paidAmountForCurrentMonth: 50 }),
      makeService({ id: 'b', estimatedAmount: null, paidAmountForCurrentMonth: 30 }),
      makeService({ id: 'c', estimatedAmount: null, paidAmountForCurrentMonth: 0 }),
    ];

    const [kpi] = buildMonthlyServicesKpis(services, CURRENT_PERIOD);

    expect(kpi.estimated).toBe(50); // only the one with an estimate
    expect(kpi.paid).toBe(80); // 50 + 30 — paid is always real money
    expect(kpi.servicesInScope).toBe(3);
    expect(kpi.servicesWithoutEstimate).toBe(2);
  });

  it('sorts the result by currency code so the render order is stable', () => {
    const services = [
      makeService({ id: 'u', currency: 'USD' }),
      makeService({ id: 'e', currency: 'EUR' }),
      makeService({ id: 'p', currency: 'PEN' }),
    ];

    const result = buildMonthlyServicesKpis(services, CURRENT_PERIOD);
    expect(result.map((k) => k.currency)).toEqual(['EUR', 'PEN', 'USD']);
  });
});

describe('getKpiProgress', () => {
  it('returns paid / estimated as a 0..1 fraction', () => {
    expect(getKpiProgress({ paid: 50, estimated: 100 })).toBe(0.5);
    expect(getKpiProgress({ paid: 0, estimated: 100 })).toBe(0);
    expect(getKpiProgress({ paid: 100, estimated: 100 })).toBe(1);
  });

  it('clamps overshoot to 1 (paying more than the estimate is common)', () => {
    expect(getKpiProgress({ paid: 150, estimated: 100 })).toBe(1);
  });

  it('returns 0 when estimated is 0 (avoids divide-by-zero / Infinity)', () => {
    expect(getKpiProgress({ paid: 50, estimated: 0 })).toBe(0);
    expect(getKpiProgress({ paid: 0, estimated: 0 })).toBe(0);
  });
});
