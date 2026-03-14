import { describe, expect, it } from 'vitest';

import {
  createTransactionSchema,
  settleTransactionSchema,
  updateTransactionSchema,
} from './transaction.schema';

describe('createTransactionSchema', () => {
  const validInput = {
    accountId: 'acc-1',
    type: 'EXPENSE' as const,
    amount: 50.0,
    date: '2026-03-13',
  };

  it('accepts valid input with required fields', () => {
    const result = createTransactionSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('accepts valid input with all fields', () => {
    const result = createTransactionSchema.safeParse({
      ...validInput,
      categoryId: 'cat-1',
      description: 'Almuerzo',
      reference: 'REF-001',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty accountId', () => {
    const result = createTransactionSchema.safeParse({ ...validInput, accountId: '' });
    expect(result.success).toBe(false);
  });

  it('rejects amount less than 0.01', () => {
    const result = createTransactionSchema.safeParse({ ...validInput, amount: 0 });
    expect(result.success).toBe(false);
  });

  it('accepts all valid transaction types', () => {
    const types = ['INCOME', 'EXPENSE', 'TRANSFER', 'DEBT', 'LOAN'] as const;
    for (const type of types) {
      const input = { ...validInput, type };
      if (type === 'TRANSFER') {
        Object.assign(input, { destinationAccountId: 'acc-2' });
      }
      if (type === 'DEBT' || type === 'LOAN') {
        Object.assign(input, { reference: 'REF-001' });
      }
      const result = createTransactionSchema.safeParse(input);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid type', () => {
    const result = createTransactionSchema.safeParse({ ...validInput, type: 'REFUND' });
    expect(result.success).toBe(false);
  });

  it('rejects empty date', () => {
    const result = createTransactionSchema.safeParse({ ...validInput, date: '' });
    expect(result.success).toBe(false);
  });

  it('rejects description exceeding 255 characters', () => {
    const result = createTransactionSchema.safeParse({
      ...validInput,
      description: 'a'.repeat(256),
    });
    expect(result.success).toBe(false);
  });

  // Refinement tests
  it('requires destinationAccountId for TRANSFER type', () => {
    const result = createTransactionSchema.safeParse({ ...validInput, type: 'TRANSFER' });
    expect(result.success).toBe(false);
  });

  it('rejects same account for TRANSFER', () => {
    const result = createTransactionSchema.safeParse({
      ...validInput,
      type: 'TRANSFER',
      destinationAccountId: 'acc-1',
    });
    expect(result.success).toBe(false);
  });

  it('accepts TRANSFER with different destination account', () => {
    const result = createTransactionSchema.safeParse({
      ...validInput,
      type: 'TRANSFER',
      destinationAccountId: 'acc-2',
    });
    expect(result.success).toBe(true);
  });

  it('requires reference for DEBT type', () => {
    const result = createTransactionSchema.safeParse({ ...validInput, type: 'DEBT' });
    expect(result.success).toBe(false);
  });

  it('requires reference for LOAN type', () => {
    const result = createTransactionSchema.safeParse({ ...validInput, type: 'LOAN' });
    expect(result.success).toBe(false);
  });

  it('accepts DEBT with reference', () => {
    const result = createTransactionSchema.safeParse({
      ...validInput,
      type: 'DEBT',
      reference: 'Juan Pérez',
    });
    expect(result.success).toBe(true);
  });
});

describe('updateTransactionSchema', () => {
  it('accepts valid partial update', () => {
    const result = updateTransactionSchema.safeParse({ amount: 100 });
    expect(result.success).toBe(true);
  });

  it('accepts empty object', () => {
    const result = updateTransactionSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects amount less than 0.01', () => {
    const result = updateTransactionSchema.safeParse({ amount: 0 });
    expect(result.success).toBe(false);
  });

  it('accepts null description', () => {
    const result = updateTransactionSchema.safeParse({ description: null });
    expect(result.success).toBe(true);
  });

  it('rejects reference exceeding 255 characters', () => {
    const result = updateTransactionSchema.safeParse({ reference: 'a'.repeat(256) });
    expect(result.success).toBe(false);
  });
});

describe('settleTransactionSchema', () => {
  const validSettle = {
    accountId: 'acc-1',
    amount: 100,
  };

  it('accepts valid settle input', () => {
    const result = settleTransactionSchema.safeParse(validSettle);
    expect(result.success).toBe(true);
  });

  it('rejects empty accountId', () => {
    const result = settleTransactionSchema.safeParse({ ...validSettle, accountId: '' });
    expect(result.success).toBe(false);
  });

  it('rejects amount less than 0.01', () => {
    const result = settleTransactionSchema.safeParse({ ...validSettle, amount: 0 });
    expect(result.success).toBe(false);
  });

  it('accepts optional description and date', () => {
    const result = settleTransactionSchema.safeParse({
      ...validSettle,
      description: 'Pago parcial',
      date: '2026-03-13',
    });
    expect(result.success).toBe(true);
  });
});
