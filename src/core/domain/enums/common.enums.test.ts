import { describe, expect, it } from 'vitest';

import { DateFormat, Language, StartOfWeek, Theme } from './common.enums';

describe('Language', () => {
  it('has ES value', () => {
    expect(Language.ES).toBe('es');
  });

  it('has EN value', () => {
    expect(Language.EN).toBe('en');
  });

  it('has PT value', () => {
    expect(Language.PT).toBe('pt');
  });

  it('has exactly 3 values', () => {
    expect(Object.keys(Language)).toHaveLength(3);
  });
});

describe('Theme', () => {
  it('has LIGHT value', () => {
    expect(Theme.LIGHT).toBe('light');
  });

  it('has DARK value', () => {
    expect(Theme.DARK).toBe('dark');
  });

  it('has SYSTEM value', () => {
    expect(Theme.SYSTEM).toBe('system');
  });

  it('has exactly 3 values', () => {
    expect(Object.keys(Theme)).toHaveLength(3);
  });
});

describe('DateFormat', () => {
  it('has DD_MM_YYYY value', () => {
    expect(DateFormat.DD_MM_YYYY).toBe('DD/MM/YYYY');
  });

  it('has MM_DD_YYYY value', () => {
    expect(DateFormat.MM_DD_YYYY).toBe('MM/DD/YYYY');
  });

  it('has YYYY_MM_DD value', () => {
    expect(DateFormat.YYYY_MM_DD).toBe('YYYY-MM-DD');
  });

  it('has exactly 3 values', () => {
    expect(Object.keys(DateFormat)).toHaveLength(3);
  });
});

describe('StartOfWeek', () => {
  it('has MONDAY value', () => {
    expect(StartOfWeek.MONDAY).toBe('monday');
  });

  it('has SUNDAY value', () => {
    expect(StartOfWeek.SUNDAY).toBe('sunday');
  });

  it('has exactly 2 values', () => {
    expect(Object.keys(StartOfWeek)).toHaveLength(2);
  });
});
