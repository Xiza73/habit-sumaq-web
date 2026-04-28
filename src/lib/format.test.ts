import { describe, expect, it } from 'vitest';

import {
  dateInputToBackendIso,
  formatCurrency,
  formatDate,
  getEstimatedPaymentDate,
  getOnlyDateFromApi,
  getTodayLocaleDate,
} from './format';

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

describe('getEstimatedPaymentDate', () => {
  it('returns null when dueDay is null', () => {
    expect(getEstimatedPaymentDate('2026-04', null)).toBeNull();
  });

  it('returns null when period has invalid shape', () => {
    expect(getEstimatedPaymentDate('not-a-period', 15)).toBeNull();
    expect(getEstimatedPaymentDate('2026-13', 15)).toBeNull();
    expect(getEstimatedPaymentDate('2026-00', 15)).toBeNull();
  });

  it('returns YYYY-MM-DD with the dueDay padded', () => {
    expect(getEstimatedPaymentDate('2026-04', 5)).toBe('2026-04-05');
    expect(getEstimatedPaymentDate('2026-04', 15)).toBe('2026-04-15');
    expect(getEstimatedPaymentDate('2026-04', 30)).toBe('2026-04-30');
  });

  it('clamps dueDay to the last valid day of months with fewer days', () => {
    // April has 30 days — dueDay=31 clamps to 30.
    expect(getEstimatedPaymentDate('2026-04', 31)).toBe('2026-04-30');
    // February 2026 has 28 days — dueDay=31 clamps to 28.
    expect(getEstimatedPaymentDate('2026-02', 31)).toBe('2026-02-28');
    // Leap year: February 2024 has 29 days.
    expect(getEstimatedPaymentDate('2024-02', 31)).toBe('2024-02-29');
  });

  it('clamps non-positive dueDay to 1 (defensive)', () => {
    expect(getEstimatedPaymentDate('2026-04', 0)).toBe('2026-04-01');
    expect(getEstimatedPaymentDate('2026-04', -5)).toBe('2026-04-01');
  });
});

describe('dateInputToBackendIso', () => {
  it('returns undefined for empty / undefined inputs', () => {
    expect(dateInputToBackendIso(undefined)).toBeUndefined();
    expect(dateInputToBackendIso('')).toBeUndefined();
  });

  it('returns undefined when the input is not YYYY-MM-DD', () => {
    expect(dateInputToBackendIso('2026/04/03')).toBeUndefined();
    expect(dateInputToBackendIso('2026-4-3')).toBeUndefined();
    expect(dateInputToBackendIso('not a date')).toBeUndefined();
  });

  it('pins valid YYYY-MM-DD to 12:00 UTC so the day is stable across timezones', () => {
    expect(dateInputToBackendIso('2026-04-03')).toBe('2026-04-03T12:00:00.000Z');
    expect(dateInputToBackendIso('2026-12-31')).toBe('2026-12-31T12:00:00.000Z');
  });

  it('regression: paying the 3rd in America/Lima still reads the 3rd on the backend', () => {
    // Repro of the bug that prompted this helper. Without the noon-UTC pin,
    // `new Date('2026-04-03')` gave 2026-04-03T00:00:00Z which is the 2nd
    // in America/Lima. The fix pins to 12:00 UTC so any zone in [-12,+14]
    // sees day=3.
    const iso = dateInputToBackendIso('2026-04-03');
    const day = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Lima',
      day: '2-digit',
    })
      .formatToParts(new Date(iso!))
      .find((p) => p.type === 'day')?.value;
    expect(day).toBe('03');
  });
});
