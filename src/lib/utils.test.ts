import { describe, expect, it } from 'vitest';

import { cn } from './utils';

describe('cn', () => {
  it('merges class names', () => {
    const result = cn('text-sm', 'font-bold');
    expect(result).toBe('text-sm font-bold');
  });

  it('handles conditional classes', () => {
    const isHidden = false;
    const result = cn('base', isHidden && 'hidden', 'visible');
    expect(result).toBe('base visible');
  });

  it('handles undefined and null', () => {
    const result = cn('base', undefined, null, 'extra');
    expect(result).toBe('base extra');
  });

  it('merges conflicting tailwind classes', () => {
    const result = cn('px-4', 'px-6');
    expect(result).toBe('px-6');
  });

  it('handles empty input', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('handles array input', () => {
    const result = cn(['text-sm', 'font-bold']);
    expect(result).toBe('text-sm font-bold');
  });
});
