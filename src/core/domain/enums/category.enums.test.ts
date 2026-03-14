import { describe, expect, it } from 'vitest';

import { CategoryType } from './category.enums';

describe('CategoryType', () => {
  it('has INCOME value', () => {
    expect(CategoryType.INCOME).toBe('INCOME');
  });

  it('has EXPENSE value', () => {
    expect(CategoryType.EXPENSE).toBe('EXPENSE');
  });

  it('has exactly 2 values', () => {
    expect(Object.keys(CategoryType)).toHaveLength(2);
  });
});
