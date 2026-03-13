import { describe, expect, it } from 'vitest';

import { createHabitSchema, habitLogSchema, updateHabitSchema } from './habit.schema';

describe('createHabitSchema', () => {
  const validInput = {
    name: 'Tomar agua',
    frequency: 'DAILY' as const,
    targetCount: 8,
  };

  it('accepts valid input with required fields only', () => {
    const result = createHabitSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('accepts valid input with all fields', () => {
    const result = createHabitSchema.safeParse({
      ...validInput,
      description: 'Beber al menos 8 vasos al día',
      color: '#2196F3',
      icon: 'water',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = createHabitSchema.safeParse({ ...validInput, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects name exceeding 100 characters', () => {
    const result = createHabitSchema.safeParse({ ...validInput, name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('rejects invalid frequency', () => {
    const result = createHabitSchema.safeParse({ ...validInput, frequency: 'MONTHLY' });
    expect(result.success).toBe(false);
  });

  it('accepts WEEKLY frequency', () => {
    const result = createHabitSchema.safeParse({ ...validInput, frequency: 'WEEKLY' });
    expect(result.success).toBe(true);
  });

  it('rejects targetCount less than 1', () => {
    const result = createHabitSchema.safeParse({ ...validInput, targetCount: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer targetCount', () => {
    const result = createHabitSchema.safeParse({ ...validInput, targetCount: 1.5 });
    expect(result.success).toBe(false);
  });

  it('rejects description exceeding 500 characters', () => {
    const result = createHabitSchema.safeParse({ ...validInput, description: 'a'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('accepts null description', () => {
    const result = createHabitSchema.safeParse({ ...validInput, description: null });
    expect(result.success).toBe(true);
  });

  it('rejects color exceeding 7 characters', () => {
    const result = createHabitSchema.safeParse({ ...validInput, color: '#1234567' });
    expect(result.success).toBe(false);
  });

  it('accepts null color and icon', () => {
    const result = createHabitSchema.safeParse({ ...validInput, color: null, icon: null });
    expect(result.success).toBe(true);
  });
});

describe('updateHabitSchema', () => {
  it('accepts valid update input', () => {
    const result = updateHabitSchema.safeParse({
      name: 'Meditar',
      frequency: 'DAILY',
      targetCount: 1,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = updateHabitSchema.safeParse({
      name: '',
      frequency: 'DAILY',
      targetCount: 1,
    });
    expect(result.success).toBe(false);
  });
});

describe('habitLogSchema', () => {
  it('accepts valid log input', () => {
    const result = habitLogSchema.safeParse({ date: '2026-03-13', count: 5 });
    expect(result.success).toBe(true);
  });

  it('accepts count of 0', () => {
    const result = habitLogSchema.safeParse({ date: '2026-03-13', count: 0 });
    expect(result.success).toBe(true);
  });

  it('rejects negative count', () => {
    const result = habitLogSchema.safeParse({ date: '2026-03-13', count: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects empty date', () => {
    const result = habitLogSchema.safeParse({ date: '', count: 1 });
    expect(result.success).toBe(false);
  });

  it('accepts optional note', () => {
    const result = habitLogSchema.safeParse({ date: '2026-03-13', count: 3, note: 'Buen día' });
    expect(result.success).toBe(true);
  });

  it('rejects note exceeding 500 characters', () => {
    const result = habitLogSchema.safeParse({
      date: '2026-03-13',
      count: 1,
      note: 'a'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer count', () => {
    const result = habitLogSchema.safeParse({ date: '2026-03-13', count: 2.5 });
    expect(result.success).toBe(false);
  });
});
