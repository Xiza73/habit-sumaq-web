import { describe, expect, it } from 'vitest';

import { createAccountSchema, updateAccountSchema } from './account.schema';

describe('createAccountSchema', () => {
  const validInput = {
    name: 'Mi cuenta',
    type: 'checking' as const,
    currency: 'PEN' as const,
    initialBalance: 1000,
  };

  it('accepts valid input with required fields', () => {
    const result = createAccountSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('accepts valid input with all fields', () => {
    const result = createAccountSchema.safeParse({
      ...validInput,
      color: '#FF5733',
      icon: 'wallet',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = createAccountSchema.safeParse({ ...validInput, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects name exceeding 100 characters', () => {
    const result = createAccountSchema.safeParse({ ...validInput, name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('accepts all valid account types', () => {
    const types = ['checking', 'savings', 'cash', 'credit_card', 'investment'] as const;
    for (const type of types) {
      const result = createAccountSchema.safeParse({ ...validInput, type });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid account type', () => {
    const result = createAccountSchema.safeParse({ ...validInput, type: 'bitcoin' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid currencies', () => {
    const currencies = ['PEN', 'USD', 'EUR'] as const;
    for (const currency of currencies) {
      const result = createAccountSchema.safeParse({ ...validInput, currency });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid currency', () => {
    const result = createAccountSchema.safeParse({ ...validInput, currency: 'GBP' });
    expect(result.success).toBe(false);
  });

  it('rejects negative initial balance', () => {
    const result = createAccountSchema.safeParse({ ...validInput, initialBalance: -100 });
    expect(result.success).toBe(false);
  });

  it('accepts zero initial balance', () => {
    const result = createAccountSchema.safeParse({ ...validInput, initialBalance: 0 });
    expect(result.success).toBe(true);
  });

  it('accepts null color and icon', () => {
    const result = createAccountSchema.safeParse({ ...validInput, color: null, icon: null });
    expect(result.success).toBe(true);
  });

  it('rejects color exceeding 7 characters', () => {
    const result = createAccountSchema.safeParse({ ...validInput, color: '#1234567' });
    expect(result.success).toBe(false);
  });

  it('rejects icon exceeding 50 characters', () => {
    const result = createAccountSchema.safeParse({ ...validInput, icon: 'a'.repeat(51) });
    expect(result.success).toBe(false);
  });
});

describe('updateAccountSchema', () => {
  it('accepts valid update input', () => {
    const result = updateAccountSchema.safeParse({ name: 'Cuenta actualizada' });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = updateAccountSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('accepts optional color and icon', () => {
    const result = updateAccountSchema.safeParse({
      name: 'Test',
      color: '#FFF',
      icon: 'bank',
    });
    expect(result.success).toBe(true);
  });
});
