import { describe, expect, it } from 'vitest';

import { createChoreSchema, markChoreDoneSchema, updateChoreSchema } from './chore.schema';

describe('createChoreSchema', () => {
  const validInput = {
    name: 'Cortar el pelo',
    intervalValue: 6,
    intervalUnit: 'weeks' as const,
    startDate: '2026-04-01',
  };

  it('accepts valid input with required fields only', () => {
    const result = createChoreSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('accepts valid input with all optional fields', () => {
    const result = createChoreSchema.safeParse({
      ...validInput,
      notes: 'En la peluquería de la esquina',
      category: 'Salud',
    });
    expect(result.success).toBe(true);
  });

  it.each(['days', 'weeks', 'months', 'years'])('accepts %s as intervalUnit', (value) => {
    const result = createChoreSchema.safeParse({ ...validInput, intervalUnit: value });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown intervalUnit', () => {
    const result = createChoreSchema.safeParse({ ...validInput, intervalUnit: 'hours' });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = createChoreSchema.safeParse({ ...validInput, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects whitespace-only name', () => {
    // Trim is applied before validation so a string of spaces becomes empty.
    const result = createChoreSchema.safeParse({ ...validInput, name: '   ' });
    expect(result.success).toBe(false);
  });

  it('rejects name exceeding 100 characters', () => {
    const result = createChoreSchema.safeParse({ ...validInput, name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('rejects intervalValue of zero', () => {
    const result = createChoreSchema.safeParse({ ...validInput, intervalValue: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects negative intervalValue', () => {
    const result = createChoreSchema.safeParse({ ...validInput, intervalValue: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer intervalValue', () => {
    const result = createChoreSchema.safeParse({ ...validInput, intervalValue: 1.5 });
    expect(result.success).toBe(false);
  });

  it('rejects malformed startDate (not YYYY-MM-DD)', () => {
    const result = createChoreSchema.safeParse({ ...validInput, startDate: '2026/04/01' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid month in startDate', () => {
    const result = createChoreSchema.safeParse({ ...validInput, startDate: '2026-13-01' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid day in startDate', () => {
    const result = createChoreSchema.safeParse({ ...validInput, startDate: '2026-04-32' });
    expect(result.success).toBe(false);
  });

  it('accepts null notes (clearing)', () => {
    const result = createChoreSchema.safeParse({ ...validInput, notes: null });
    expect(result.success).toBe(true);
  });

  it('accepts null category (clearing)', () => {
    const result = createChoreSchema.safeParse({ ...validInput, category: null });
    expect(result.success).toBe(true);
  });

  it('rejects category exceeding 50 chars', () => {
    const result = createChoreSchema.safeParse({ ...validInput, category: 'a'.repeat(51) });
    expect(result.success).toBe(false);
  });

  it('rejects notes exceeding 1000 chars', () => {
    const result = createChoreSchema.safeParse({ ...validInput, notes: 'a'.repeat(1001) });
    expect(result.success).toBe(false);
  });
});

describe('updateChoreSchema', () => {
  it('accepts an empty object (no-op)', () => {
    const result = updateChoreSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial update with name only', () => {
    const result = updateChoreSchema.safeParse({ name: 'Nuevo nombre' });
    expect(result.success).toBe(true);
  });

  it('accepts a manual nextDueDate override', () => {
    const result = updateChoreSchema.safeParse({ nextDueDate: '2026-05-15' });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = updateChoreSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects malformed nextDueDate', () => {
    const result = updateChoreSchema.safeParse({ nextDueDate: 'tomorrow' });
    expect(result.success).toBe(false);
  });

  it('strips intervalValue / intervalUnit (immutable after creation)', () => {
    const payload = { name: 'x', intervalValue: 10, intervalUnit: 'days' };
    const parsed = updateChoreSchema.parse(payload);
    expect(parsed).not.toHaveProperty('intervalValue');
    expect(parsed).not.toHaveProperty('intervalUnit');
  });

  it('accepts null notes / null category for clearing', () => {
    const result = updateChoreSchema.safeParse({ notes: null, category: null });
    expect(result.success).toBe(true);
  });
});

describe('markChoreDoneSchema', () => {
  it('accepts an empty object (server defaults to today)', () => {
    const result = markChoreDoneSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts a valid doneAt', () => {
    const result = markChoreDoneSchema.safeParse({ doneAt: '2026-04-15' });
    expect(result.success).toBe(true);
  });

  it('rejects malformed doneAt', () => {
    const result = markChoreDoneSchema.safeParse({ doneAt: '2026/04/15' });
    expect(result.success).toBe(false);
  });

  it('accepts a note up to 500 chars', () => {
    const result = markChoreDoneSchema.safeParse({ note: 'a'.repeat(500) });
    expect(result.success).toBe(true);
  });

  it('rejects a note longer than 500 chars', () => {
    const result = markChoreDoneSchema.safeParse({ note: 'a'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('accepts a null note (clearing)', () => {
    const result = markChoreDoneSchema.safeParse({ note: null });
    expect(result.success).toBe(true);
  });
});
