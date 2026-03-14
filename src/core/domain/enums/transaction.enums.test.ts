import { describe, expect, it } from 'vitest';

import { TransactionStatus, TransactionType } from './transaction.enums';

describe('TransactionType', () => {
  it('has INCOME value', () => {
    expect(TransactionType.INCOME).toBe('INCOME');
  });

  it('has EXPENSE value', () => {
    expect(TransactionType.EXPENSE).toBe('EXPENSE');
  });

  it('has TRANSFER value', () => {
    expect(TransactionType.TRANSFER).toBe('TRANSFER');
  });

  it('has DEBT value', () => {
    expect(TransactionType.DEBT).toBe('DEBT');
  });

  it('has LOAN value', () => {
    expect(TransactionType.LOAN).toBe('LOAN');
  });

  it('has exactly 5 values', () => {
    expect(Object.keys(TransactionType)).toHaveLength(5);
  });
});

describe('TransactionStatus', () => {
  it('has PENDING value', () => {
    expect(TransactionStatus.PENDING).toBe('PENDING');
  });

  it('has SETTLED value', () => {
    expect(TransactionStatus.SETTLED).toBe('SETTLED');
  });

  it('has exactly 2 values', () => {
    expect(Object.keys(TransactionStatus)).toHaveLength(2);
  });
});
