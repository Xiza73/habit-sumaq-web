import { describe, expect, it } from 'vitest';

import { detectMilestoneCrossed, STREAK_MILESTONES } from './streak-milestones';

describe('STREAK_MILESTONES', () => {
  it('exposes the fixed thresholds', () => {
    expect(STREAK_MILESTONES.week).toBe(7);
    expect(STREAK_MILESTONES.month).toBe(30);
    expect(STREAK_MILESTONES.centuryStep).toBe(100);
  });
});

describe('detectMilestoneCrossed — week (7)', () => {
  it('fires when crossing 0 → 7', () => {
    expect(detectMilestoneCrossed(0, 7)).toEqual({ kind: 'week', days: 7 });
  });

  it('fires when crossing 6 → 7', () => {
    expect(detectMilestoneCrossed(6, 7)).toEqual({ kind: 'week', days: 7 });
  });

  it('fires when jumping 0 → 10 (still week, not month yet)', () => {
    expect(detectMilestoneCrossed(0, 10)).toEqual({ kind: 'week', days: 7 });
  });

  it('does not fire when already past the threshold (7 → 8)', () => {
    expect(detectMilestoneCrossed(7, 8)).toBeNull();
  });

  it('does not fire when staying below (5 → 6)', () => {
    expect(detectMilestoneCrossed(5, 6)).toBeNull();
  });
});

describe('detectMilestoneCrossed — month (30)', () => {
  it('fires when crossing 29 → 30', () => {
    expect(detectMilestoneCrossed(29, 30)).toEqual({ kind: 'month', days: 30 });
  });

  it('fires when jumping 0 → 30 (month wins over week)', () => {
    expect(detectMilestoneCrossed(0, 30)).toEqual({ kind: 'month', days: 30 });
  });

  it('fires when jumping 7 → 30 (month, not week — week already passed)', () => {
    expect(detectMilestoneCrossed(7, 30)).toEqual({ kind: 'month', days: 30 });
  });

  it('does not fire on 30 → 31', () => {
    expect(detectMilestoneCrossed(30, 31)).toBeNull();
  });
});

describe('detectMilestoneCrossed — century (100+)', () => {
  it('fires at exactly 99 → 100', () => {
    expect(detectMilestoneCrossed(99, 100)).toEqual({ kind: 'century', days: 100 });
  });

  it('fires at 199 → 200', () => {
    expect(detectMilestoneCrossed(199, 200)).toEqual({ kind: 'century', days: 200 });
  });

  it('fires at 299 → 300', () => {
    expect(detectMilestoneCrossed(299, 300)).toEqual({ kind: 'century', days: 300 });
  });

  it('reports the LOWEST century crossed when skipping multiple (150 → 350 → 200)', () => {
    expect(detectMilestoneCrossed(150, 350)).toEqual({ kind: 'century', days: 200 });
  });

  it('reports 100 when jumping 0 → 100 (century wins over month + week)', () => {
    expect(detectMilestoneCrossed(0, 100)).toEqual({ kind: 'century', days: 100 });
  });

  it('reports 100 when jumping 50 → 120', () => {
    expect(detectMilestoneCrossed(50, 120)).toEqual({ kind: 'century', days: 100 });
  });

  it('does not fire on 100 → 101', () => {
    expect(detectMilestoneCrossed(100, 101)).toBeNull();
  });

  it('does not fire on 150 → 199', () => {
    expect(detectMilestoneCrossed(150, 199)).toBeNull();
  });
});

describe('detectMilestoneCrossed — no crossing', () => {
  it('returns null when streak stays the same', () => {
    expect(detectMilestoneCrossed(5, 5)).toBeNull();
    expect(detectMilestoneCrossed(7, 7)).toBeNull();
    expect(detectMilestoneCrossed(100, 100)).toBeNull();
  });

  it('returns null when streak decreases (undo path)', () => {
    expect(detectMilestoneCrossed(10, 5)).toBeNull();
    expect(detectMilestoneCrossed(30, 29)).toBeNull();
    expect(detectMilestoneCrossed(200, 199)).toBeNull();
  });

  it('returns null for small increments below any threshold', () => {
    expect(detectMilestoneCrossed(0, 1)).toBeNull();
    expect(detectMilestoneCrossed(3, 5)).toBeNull();
  });

  it('returns null for increments between thresholds (31 → 50, 101 → 150)', () => {
    expect(detectMilestoneCrossed(31, 50)).toBeNull();
    expect(detectMilestoneCrossed(101, 150)).toBeNull();
  });
});

describe('detectMilestoneCrossed — priority (highest wins)', () => {
  it('picks century over month+week when all three cross', () => {
    expect(detectMilestoneCrossed(0, 100)).toEqual({ kind: 'century', days: 100 });
  });

  it('picks month over week when both cross', () => {
    expect(detectMilestoneCrossed(0, 30)).toEqual({ kind: 'month', days: 30 });
    expect(detectMilestoneCrossed(6, 30)).toEqual({ kind: 'month', days: 30 });
  });
});
