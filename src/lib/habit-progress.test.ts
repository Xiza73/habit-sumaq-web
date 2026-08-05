import { describe, expect, it } from 'vitest';

import { getHabitProgress } from './habit-progress';

describe('getHabitProgress', () => {
  it('uses periodCount and periodCompleted when present', () => {
    const result = getHabitProgress({
      todayLog: { count: 1 },
      periodCount: 2,
      periodCompleted: false,
      targetCount: 3,
    });
    expect(result).toEqual({
      todayCount: 1,
      periodCount: 2,
      isCompleted: false,
      progress: 2 / 3,
    });
  });

  it('falls back to todayLog.count when periodCount is absent', () => {
    const result = getHabitProgress({
      todayLog: { count: 4 },
      periodCount: undefined,
      periodCompleted: undefined,
      targetCount: 5,
    });
    expect(result.periodCount).toBe(4);
    expect(result.todayCount).toBe(4);
    expect(result.progress).toBe(4 / 5);
  });

  it('falls back to 0 when there is no log and no periodCount', () => {
    const result = getHabitProgress({ todayLog: null, targetCount: 3 });
    expect(result).toEqual({ todayCount: 0, periodCount: 0, isCompleted: false, progress: 0 });
  });

  it('derives isCompleted from periodCount >= targetCount when the flag is absent', () => {
    const result = getHabitProgress({ todayLog: { count: 3 }, targetCount: 3 });
    expect(result.isCompleted).toBe(true);
  });

  it('clamps progress to 1 when the count exceeds the target', () => {
    const result = getHabitProgress({ periodCount: 6, targetCount: 3 });
    expect(result.progress).toBe(1);
  });

  it('honors an explicit periodCompleted flag over the derived value', () => {
    const result = getHabitProgress({
      todayLog: { count: 0 },
      periodCount: 0,
      periodCompleted: true,
      targetCount: 3,
    });
    expect(result.isCompleted).toBe(true);
  });
});
