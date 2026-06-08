import { describe, expect, it } from 'vitest';

import { AccountType } from './account.enums';

// Currency tests moved to `./currency.enum.test.ts` in Phase A2 of the
// accounts-to-modular-finance v1.0.0 refactor (the enum itself was extracted).

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
