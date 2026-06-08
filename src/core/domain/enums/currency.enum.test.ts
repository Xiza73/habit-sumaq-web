import { describe, expect, it } from 'vitest';

import { Currency } from './currency.enum';

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
