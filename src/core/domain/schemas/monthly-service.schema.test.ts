import { describe, expect, it } from 'vitest';

import {
  createMonthlyServiceSchema,
  payMonthlyServiceSchema,
  updateMonthlyServiceSchema,
} from './monthly-service.schema';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';
const ANOTHER_UUID = '223e4567-e89b-12d3-a456-426614174000';

describe('createMonthlyServiceSchema', () => {
  const validInput = {
    name: 'Luz',
    defaultAccountId: VALID_UUID,
    categoryId: ANOTHER_UUID,
    currency: 'PEN',
  };

  it('accepts valid input with required fields only', () => {
    const result = createMonthlyServiceSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('accepts valid input with all fields', () => {
    const result = createMonthlyServiceSchema.safeParse({
      ...validInput,
      frequencyMonths: 3,
      estimatedAmount: 120.5,
      dueDay: 15,
      startPeriod: '2026-01',
    });
    expect(result.success).toBe(true);
  });

  it.each([1, 3, 6, 12])('accepts %i as frequencyMonths', (value) => {
    const result = createMonthlyServiceSchema.safeParse({ ...validInput, frequencyMonths: value });
    expect(result.success).toBe(true);
  });

  it.each([0, 2, 4, 5, 7, 13, 99])('rejects %i as frequencyMonths', (value) => {
    const result = createMonthlyServiceSchema.safeParse({ ...validInput, frequencyMonths: value });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = createMonthlyServiceSchema.safeParse({ ...validInput, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects name exceeding 100 characters', () => {
    const result = createMonthlyServiceSchema.safeParse({
      ...validInput,
      name: 'a'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-uuid defaultAccountId', () => {
    const result = createMonthlyServiceSchema.safeParse({
      ...validInput,
      defaultAccountId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-uuid categoryId', () => {
    const result = createMonthlyServiceSchema.safeParse({
      ...validInput,
      categoryId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects currency with wrong length', () => {
    const result = createMonthlyServiceSchema.safeParse({ ...validInput, currency: 'PE' });
    expect(result.success).toBe(false);
  });

  it('accepts null estimatedAmount', () => {
    const result = createMonthlyServiceSchema.safeParse({
      ...validInput,
      estimatedAmount: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects zero estimatedAmount', () => {
    const result = createMonthlyServiceSchema.safeParse({
      ...validInput,
      estimatedAmount: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative estimatedAmount', () => {
    const result = createMonthlyServiceSchema.safeParse({
      ...validInput,
      estimatedAmount: -10,
    });
    expect(result.success).toBe(false);
  });

  it('accepts null dueDay', () => {
    const result = createMonthlyServiceSchema.safeParse({ ...validInput, dueDay: null });
    expect(result.success).toBe(true);
  });

  it('rejects dueDay below 1', () => {
    const result = createMonthlyServiceSchema.safeParse({ ...validInput, dueDay: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects dueDay above 31', () => {
    const result = createMonthlyServiceSchema.safeParse({ ...validInput, dueDay: 32 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer dueDay', () => {
    const result = createMonthlyServiceSchema.safeParse({ ...validInput, dueDay: 1.5 });
    expect(result.success).toBe(false);
  });

  it('rejects malformed startPeriod', () => {
    const result = createMonthlyServiceSchema.safeParse({
      ...validInput,
      startPeriod: '2026-13',
    });
    expect(result.success).toBe(false);
  });

  it('accepts omitted startPeriod', () => {
    const result = createMonthlyServiceSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });
});

describe('updateMonthlyServiceSchema', () => {
  it('accepts partial update with name only', () => {
    const result = updateMonthlyServiceSchema.safeParse({ name: 'Luz del sur' });
    expect(result.success).toBe(true);
  });

  it('accepts empty object (no-op update)', () => {
    const result = updateMonthlyServiceSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts null estimatedAmount to clear', () => {
    const result = updateMonthlyServiceSchema.safeParse({ estimatedAmount: null });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = updateMonthlyServiceSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects dueDay out of range', () => {
    const result = updateMonthlyServiceSchema.safeParse({ dueDay: 40 });
    expect(result.success).toBe(false);
  });

  it('strips unknown keys like currency (immutable after creation)', () => {
    // Zod strips unknown keys by default. Both `currency` and `startPeriod`
    // are deliberately absent from the update schema because they are immutable
    // server-side — make sure a payload carrying them is still parsed cleanly
    // and the extra keys are dropped.
    const payload = { name: 'x', currency: 'USD', startPeriod: '2026-02' };
    const parsed = updateMonthlyServiceSchema.parse(payload);
    expect(parsed).not.toHaveProperty('currency');
    expect(parsed).not.toHaveProperty('startPeriod');
  });
});

describe('payMonthlyServiceSchema', () => {
  it('accepts valid minimal input (amount only)', () => {
    const result = payMonthlyServiceSchema.safeParse({ amount: 120 });
    expect(result.success).toBe(true);
  });

  it('accepts valid input with all fields', () => {
    const result = payMonthlyServiceSchema.safeParse({
      amount: 120,
      date: '2026-04-15',
      description: 'Pago luz abril',
      accountIdOverride: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it('rejects zero amount', () => {
    const result = payMonthlyServiceSchema.safeParse({ amount: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects negative amount', () => {
    const result = payMonthlyServiceSchema.safeParse({ amount: -10 });
    expect(result.success).toBe(false);
  });

  it('accepts null description', () => {
    const result = payMonthlyServiceSchema.safeParse({ amount: 120, description: null });
    expect(result.success).toBe(true);
  });

  it('rejects non-uuid accountIdOverride', () => {
    const result = payMonthlyServiceSchema.safeParse({
      amount: 120,
      accountIdOverride: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects description exceeding 255 chars', () => {
    const result = payMonthlyServiceSchema.safeParse({
      amount: 120,
      description: 'a'.repeat(256),
    });
    expect(result.success).toBe(false);
  });
});
