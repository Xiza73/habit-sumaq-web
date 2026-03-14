import { describe, expect, it } from 'vitest';

import { createCategorySchema, updateCategorySchema } from './category.schema';

describe('createCategorySchema', () => {
  const validInput = {
    name: 'Alimentación',
    type: 'EXPENSE' as const,
  };

  it('accepts valid input with required fields', () => {
    const result = createCategorySchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('accepts valid input with all fields', () => {
    const result = createCategorySchema.safeParse({
      ...validInput,
      color: '#4CAF50',
      icon: 'utensils',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = createCategorySchema.safeParse({ ...validInput, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects name exceeding 100 characters', () => {
    const result = createCategorySchema.safeParse({ ...validInput, name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('accepts INCOME type', () => {
    const result = createCategorySchema.safeParse({ ...validInput, type: 'INCOME' });
    expect(result.success).toBe(true);
  });

  it('accepts EXPENSE type', () => {
    const result = createCategorySchema.safeParse({ ...validInput, type: 'EXPENSE' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid type', () => {
    const result = createCategorySchema.safeParse({ ...validInput, type: 'TRANSFER' });
    expect(result.success).toBe(false);
  });

  it('accepts null color and icon', () => {
    const result = createCategorySchema.safeParse({ ...validInput, color: null, icon: null });
    expect(result.success).toBe(true);
  });

  it('rejects color exceeding 7 characters', () => {
    const result = createCategorySchema.safeParse({ ...validInput, color: '#1234567' });
    expect(result.success).toBe(false);
  });
});

describe('updateCategorySchema', () => {
  it('accepts valid update input', () => {
    const result = updateCategorySchema.safeParse({ name: 'Transporte' });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = updateCategorySchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('accepts optional color and icon', () => {
    const result = updateCategorySchema.safeParse({
      name: 'Test',
      color: '#FFF',
      icon: 'car',
    });
    expect(result.success).toBe(true);
  });
});
