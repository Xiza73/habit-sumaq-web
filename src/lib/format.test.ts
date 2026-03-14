import { describe, expect, it } from 'vitest';

import { formatCurrency, formatDate, getOnlyDateFromApi, getTodayLocaleDate } from './format';

describe('formatCurrency', () => {
  it('formats PEN currency', () => {
    const result = formatCurrency(1500.5, 'PEN');
    expect(result).toContain('1');
    expect(result).toContain('500');
    expect(result).toContain('50');
  });

  it('formats USD currency', () => {
    const result = formatCurrency(1234.56, 'USD');
    expect(result).toContain('1');
    expect(result).toContain('234');
    expect(result).toContain('56');
  });

  it('formats EUR currency', () => {
    const result = formatCurrency(999.0, 'EUR');
    expect(result).toContain('999');
    expect(result).toContain('00');
  });

  it('formats zero amount', () => {
    const result = formatCurrency(0, 'PEN');
    expect(result).toContain('0');
  });

  it('formats negative amount', () => {
    const result = formatCurrency(-250.75, 'USD');
    expect(result).toContain('250');
    expect(result).toContain('75');
  });
});

describe('formatDate', () => {
  it('formats date as DD/MM/YYYY', () => {
    const result = formatDate('2026-03-15T12:00:00.000Z', 'DD/MM/YYYY');
    expect(result).toBe('15/03/2026');
  });

  it('formats date as MM/DD/YYYY', () => {
    const result = formatDate('2026-03-15T12:00:00.000Z', 'MM/DD/YYYY');
    expect(result).toBe('03/15/2026');
  });

  it('formats date as YYYY-MM-DD', () => {
    const result = formatDate('2026-03-15T12:00:00.000Z', 'YYYY-MM-DD');
    expect(result).toBe('2026-03-15');
  });

  it('pads single-digit day and month', () => {
    const result = formatDate('2026-01-05T12:00:00.000Z', 'DD/MM/YYYY');
    expect(result).toBe('05/01/2026');
  });
});

describe('getTodayLocaleDate', () => {
  it('returns date in YYYY-MM-DD format', () => {
    const result = getTodayLocaleDate();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns today date', () => {
    const result = getTodayLocaleDate();
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    expect(result).toBe(`${year}-${month}-${day}`);
  });
});

describe('getOnlyDateFromApi', () => {
  it('extracts date from API string', () => {
    const result = getOnlyDateFromApi('2026-03-13T10:30:00.000Z');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('handles date without Z suffix', () => {
    const result = getOnlyDateFromApi('2026-03-13T10:30:00.000');
    expect(result).toBeTruthy();
  });
});
