import { describe, expect, it } from 'vitest';

import { type Category } from '@/core/domain/entities/category';
import { type MonthlyService } from '@/core/domain/entities/monthly-service';

import { applyView, groupServices, sortServices } from './monthly-services-view';

function makeService(overrides: Partial<MonthlyService> = {}): MonthlyService {
  return {
    id: overrides.id ?? 'svc',
    userId: 'user-1',
    name: 'Service',
    defaultAccountId: 'acc-1',
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
    nextDuePeriod: '2026-04',
    isOverdue: false,
    isPaidForCurrentMonth: false,
    ...overrides,
  };
}

describe('sortServices', () => {
  it('sorts by name ascending (case-insensitive)', () => {
    const list = [makeService({ name: 'Netflix' }), makeService({ name: 'agua' })];
    const sorted = sortServices(list, 'name', 'asc');
    expect(sorted.map((s) => s.name)).toEqual(['agua', 'Netflix']);
  });

  it('sorts by name descending', () => {
    const list = [makeService({ name: 'Netflix' }), makeService({ name: 'agua' })];
    const sorted = sortServices(list, 'name', 'desc');
    expect(sorted.map((s) => s.name)).toEqual(['Netflix', 'agua']);
  });

  it('sorts by dueDay with nulls always at the end (ASC and DESC)', () => {
    const list = [
      makeService({ id: 'a', name: 'A', dueDay: 20 }),
      makeService({ id: 'b', name: 'B', dueDay: null }),
      makeService({ id: 'c', name: 'C', dueDay: 5 }),
    ];
    const asc = sortServices(list, 'dueDay', 'asc');
    expect(asc.map((s) => s.id)).toEqual(['c', 'a', 'b']);
    const desc = sortServices(list, 'dueDay', 'desc');
    expect(desc.map((s) => s.id)).toEqual(['a', 'c', 'b']);
  });

  it('sorts by nextDuePeriod (overdue services bubble up in ASC)', () => {
    const list = [
      makeService({ id: 'now', nextDuePeriod: '2026-04' }),
      makeService({ id: 'late', nextDuePeriod: '2026-01' }),
      makeService({ id: 'future', nextDuePeriod: '2026-08' }),
    ];
    const asc = sortServices(list, 'nextDuePeriod', 'asc');
    expect(asc.map((s) => s.id)).toEqual(['late', 'now', 'future']);
  });

  it('sorts by estimatedAmount with nulls at the end', () => {
    const list = [
      makeService({ id: 'a', estimatedAmount: 100 }),
      makeService({ id: 'b', estimatedAmount: null }),
      makeService({ id: 'c', estimatedAmount: 30 }),
    ];
    const asc = sortServices(list, 'estimatedAmount', 'asc');
    expect(asc.map((s) => s.id)).toEqual(['c', 'a', 'b']);
    const desc = sortServices(list, 'estimatedAmount', 'desc');
    expect(desc.map((s) => s.id)).toEqual(['a', 'c', 'b']);
  });

  it('sorts by createdAt', () => {
    const list = [
      makeService({ id: 'old', createdAt: '2025-01-01T00:00:00.000Z' }),
      makeService({ id: 'new', createdAt: '2026-01-01T00:00:00.000Z' }),
    ];
    const desc = sortServices(list, 'createdAt', 'desc');
    expect(desc.map((s) => s.id)).toEqual(['new', 'old']);
  });
});

describe('groupServices', () => {
  it('produces a single "all" group for groupBy=none', () => {
    const list = [makeService({ id: 'a' }), makeService({ id: 'b' })];
    const groups = groupServices(list, 'none');
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe('all');
    expect(groups[0].services.map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('groups by status in canonical order: overdue, pending, paid, archived', () => {
    const list = [
      makeService({ id: 'paid', isPaidForCurrentMonth: true }),
      makeService({ id: 'overdue', isOverdue: true }),
      makeService({ id: 'archived', isActive: false }),
      makeService({ id: 'pending' }),
    ];
    const groups = groupServices(list, 'status');
    expect(groups.map((g) => g.key)).toEqual(['overdue', 'pending', 'paid', 'archived']);
  });

  it('omits status groups that have zero services', () => {
    const list = [makeService({ id: 'p1' }), makeService({ id: 'p2' })];
    const groups = groupServices(list, 'status');
    // Only "pending" — others empty.
    expect(groups.map((g) => g.key)).toEqual(['pending']);
  });

  it('groups by frequency in ascending months (1 -> 3 -> 6 -> 12)', () => {
    const list = [
      makeService({ id: 'q', frequencyMonths: 3 }),
      makeService({ id: 'm', frequencyMonths: 1 }),
      makeService({ id: 'a', frequencyMonths: 12 }),
    ];
    const groups = groupServices(list, 'frequency');
    expect(groups.map((g) => g.key)).toEqual(['1', '3', '12']);
  });

  it('groups by category and pushes uncategorised to the end', () => {
    const cats: Map<string, Category> = new Map([
      [
        'cat-a',
        {
          id: 'cat-a',
          userId: 'u',
          name: 'Streaming',
          color: null,
          icon: null,
          type: 'EXPENSE',
          isDefault: false,
          createdAt: '',
          updatedAt: '',
        },
      ],
    ]);
    const list = [
      makeService({ id: '1', categoryId: 'cat-unknown' }),
      makeService({ id: '2', categoryId: 'cat-a' }),
      makeService({ id: '3', categoryId: 'cat-a' }),
    ];
    const groups = groupServices(list, 'category', cats);
    // 'cat-a' is the only known category; 'cat-unknown' falls into
    // 'null-category' which is forced to the end even though it appeared first.
    expect(groups.map((g) => g.key)).toEqual(['cat-a', 'null-category']);
    expect(groups[0].services.map((s) => s.id)).toEqual(['2', '3']);
    expect(groups[1].services.map((s) => s.id)).toEqual(['1']);
  });
});

describe('applyView', () => {
  it('chains sort and group: services inside each group keep the sort order', () => {
    const list = [
      makeService({ id: 'b', name: 'b', frequencyMonths: 1 }),
      makeService({ id: 'a', name: 'a', frequencyMonths: 1 }),
      makeService({ id: 'c', name: 'c', frequencyMonths: 3 }),
    ];
    const groups = applyView(list, { groupBy: 'frequency', orderBy: 'name', orderDir: 'asc' });
    expect(groups[0].services.map((s) => s.id)).toEqual(['a', 'b']);
    expect(groups[1].services.map((s) => s.id)).toEqual(['c']);
  });
});
