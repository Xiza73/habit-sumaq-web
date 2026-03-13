import { describe, expect, it } from 'vitest';

import { HabitFrequency } from './habit.enums';

describe('HabitFrequency', () => {
  it('has DAILY value', () => {
    expect(HabitFrequency.DAILY).toBe('DAILY');
  });

  it('has WEEKLY value', () => {
    expect(HabitFrequency.WEEKLY).toBe('WEEKLY');
  });

  it('has exactly 2 values', () => {
    expect(Object.keys(HabitFrequency)).toHaveLength(2);
  });
});
