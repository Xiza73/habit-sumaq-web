import { describe, expect, it } from 'vitest';

import { getChoreStatus } from './chore-status';

describe('getChoreStatus', () => {
  it('returns "upcoming" when nextDueDate equals today (boundary)', () => {
    // Same calendar day => upcoming (NOT overdue) — the user still has the
    // whole day to do it.
    expect(getChoreStatus('2026-04-15', '2026-04-15')).toBe('upcoming');
  });

  it('returns "overdue" when nextDueDate is one day before today', () => {
    expect(getChoreStatus('2026-04-14', '2026-04-15')).toBe('overdue');
  });

  it('returns "overdue" when nextDueDate is many days before today', () => {
    expect(getChoreStatus('2026-01-01', '2026-04-15')).toBe('overdue');
  });

  it('returns "upcoming" when nextDueDate is exactly 7 days away (upper boundary)', () => {
    expect(getChoreStatus('2026-04-22', '2026-04-15')).toBe('upcoming');
  });

  it('returns "horizon" when nextDueDate is 8 days away (just over the boundary)', () => {
    expect(getChoreStatus('2026-04-23', '2026-04-15')).toBe('horizon');
  });

  it('returns "horizon" when nextDueDate is far in the future', () => {
    expect(getChoreStatus('2027-04-15', '2026-04-15')).toBe('horizon');
  });

  it('returns "upcoming" for tomorrow', () => {
    expect(getChoreStatus('2026-04-16', '2026-04-15')).toBe('upcoming');
  });

  it('falls back to "horizon" on malformed dates rather than throwing', () => {
    // Defensive: if the backend ever returns a malformed string we don't want
    // to crash the whole list — the worst case is a slightly wrong chip.
    expect(getChoreStatus('invalid', '2026-04-15')).toBe('horizon');
    expect(getChoreStatus('2026-04-15', 'invalid')).toBe('horizon');
  });

  it('handles month boundaries correctly (last day of month)', () => {
    // 30 → 31 of the month is overdue.
    expect(getChoreStatus('2026-04-30', '2026-05-01')).toBe('overdue');
    // 1 → 7 of the next month is still upcoming when we're at the boundary.
    expect(getChoreStatus('2026-05-08', '2026-05-01')).toBe('upcoming');
  });

  it('handles year boundaries correctly', () => {
    expect(getChoreStatus('2025-12-31', '2026-01-01')).toBe('overdue');
    expect(getChoreStatus('2026-01-05', '2025-12-31')).toBe('upcoming');
  });
});
