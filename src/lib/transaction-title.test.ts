import { describe, expect, it } from 'vitest';

import { type Category } from '@/core/domain/entities/category';
import { type Transaction } from '@/core/domain/entities/transaction';
import { type TransactionType } from '@/core/domain/enums/transaction.enums';

import { getTransactionDisplayTitle } from './transaction-title';

// Minimal `t(\`types.\${type}\`)` substitute for tests so we don't have to
// drag next-intl into a pure-helper test file.
const typeLabel = (type: TransactionType): string => `type:${type}`;

function makeTxn(
  overrides: Partial<Pick<Transaction, 'description' | 'type'>> = {},
): Pick<Transaction, 'description' | 'type'> {
  return { description: null, type: 'EXPENSE', ...overrides };
}

const category: Pick<Category, 'name'> = { name: 'Comida' };

describe('getTransactionDisplayTitle', () => {
  it('returns the description verbatim when it is set', () => {
    const result = getTransactionDisplayTitle(
      makeTxn({ description: 'Almuerzo con Juan' }),
      category,
      typeLabel,
    );
    expect(result).toBe('Almuerzo con Juan');
  });

  it('falls back to the category name when description is null', () => {
    const result = getTransactionDisplayTitle(makeTxn({ description: null }), category, typeLabel);
    expect(result).toBe('Comida');
  });

  it('falls back to the category name when description is an empty string', () => {
    // Edge case worth testing: react-hook-form sometimes hands back '' rather
    // than null. Treat both as "no description" so the UI is consistent.
    const result = getTransactionDisplayTitle(makeTxn({ description: '' }), category, typeLabel);
    expect(result).toBe('Comida');
  });

  it('falls back to the localized type label when neither description nor category exist', () => {
    const result = getTransactionDisplayTitle(
      makeTxn({ description: null, type: 'TRANSFER' }),
      null,
      typeLabel,
    );
    expect(result).toBe('type:TRANSFER');
  });

  it('falls back to the type label when category is undefined (lookup not loaded)', () => {
    // `categoriesById.get(...)` returns undefined for a missing id; treat
    // that the same as no category — the helper must not crash.
    const result = getTransactionDisplayTitle(
      makeTxn({ description: null, type: 'INCOME' }),
      undefined,
      typeLabel,
    );
    expect(result).toBe('type:INCOME');
  });

  it('prefers description over category even when both are present', () => {
    const result = getTransactionDisplayTitle(
      makeTxn({ description: 'Pago de Spotify' }),
      category,
      typeLabel,
    );
    expect(result).toBe('Pago de Spotify');
  });
});
