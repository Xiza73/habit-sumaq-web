import { describe, expect, it } from 'vitest';

import { AccountType, Currency } from './account.enums';

describe('AccountType', () => {
  it('has CHECKING value', () => {
    expect(AccountType.CHECKING).toBe('checking');
  });

  it('has SAVINGS value', () => {
    expect(AccountType.SAVINGS).toBe('savings');
  });

  it('has CASH value', () => {
    expect(AccountType.CASH).toBe('cash');
  });

  it('has CREDIT_CARD value', () => {
    expect(AccountType.CREDIT_CARD).toBe('credit_card');
  });

  it('has INVESTMENT value', () => {
    expect(AccountType.INVESTMENT).toBe('investment');
  });

  it('has exactly 5 values', () => {
    expect(Object.keys(AccountType)).toHaveLength(5);
  });
});

describe('Currency', () => {
  it('has PEN value', () => {
    expect(Currency.PEN).toBe('PEN');
  });

  it('has USD value', () => {
    expect(Currency.USD).toBe('USD');
  });

  it('has EUR value', () => {
    expect(Currency.EUR).toBe('EUR');
  });

  it('has exactly 3 values', () => {
    expect(Object.keys(Currency)).toHaveLength(3);
  });
});
