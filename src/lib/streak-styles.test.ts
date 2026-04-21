import { describe, expect, it } from 'vitest';

import { getStreakStyle, getStreakTier } from './streak-styles';

describe('getStreakTier', () => {
  it('returns 0 for streak === 0', () => {
    expect(getStreakTier(0)).toBe(0);
  });

  it('treats negative streaks as tier 0 (defensive)', () => {
    expect(getStreakTier(-5)).toBe(0);
  });

  it('returns 1 for streaks in 1–6', () => {
    expect(getStreakTier(1)).toBe(1);
    expect(getStreakTier(3)).toBe(1);
    expect(getStreakTier(6)).toBe(1);
  });

  it('returns 2 for streaks in 7–29', () => {
    expect(getStreakTier(7)).toBe(2);
    expect(getStreakTier(15)).toBe(2);
    expect(getStreakTier(29)).toBe(2);
  });

  it('returns 3 for streaks in 30–99', () => {
    expect(getStreakTier(30)).toBe(3);
    expect(getStreakTier(65)).toBe(3);
    expect(getStreakTier(99)).toBe(3);
  });

  it('returns 4 for streaks >= 100', () => {
    expect(getStreakTier(100)).toBe(4);
    expect(getStreakTier(365)).toBe(4);
    expect(getStreakTier(10_000)).toBe(4);
  });
});

describe('getStreakStyle', () => {
  it('returns muted flame and no card styling for tier 0', () => {
    const style = getStreakStyle(0);
    expect(style.tier).toBe(0);
    expect(style.flameClass).toContain('text-muted-foreground');
    expect(style.cardClass).toBe('');
  });

  it('keeps the orange flame and adds a subtle warm gradient for tier 1', () => {
    const style = getStreakStyle(3);
    expect(style.tier).toBe(1);
    expect(style.flameClass).toContain('text-orange-500');
    expect(style.cardClass).toContain('orange-500');
    expect(style.cardClass).toContain('bg-gradient');
  });

  it('uses a red flame with slow pulse and warm gradient for tier 2', () => {
    const style = getStreakStyle(10);
    expect(style.tier).toBe(2);
    expect(style.flameClass).toContain('text-red-500');
    expect(style.flameClass).toContain('animate-pulse');
    expect(style.cardClass).toContain('red-500');
    expect(style.cardClass).toContain('bg-gradient');
  });

  it('uses an amber/gold flame and gold gradient for tier 3', () => {
    const style = getStreakStyle(50);
    expect(style.tier).toBe(3);
    expect(style.flameClass).toContain('text-amber-500');
    expect(style.flameClass).toContain('animate-pulse');
    expect(style.cardClass).toContain('amber-500');
  });

  it('adds purple flame with glow and multi-color gradient for tier 4', () => {
    const style = getStreakStyle(200);
    expect(style.tier).toBe(4);
    expect(style.flameClass).toContain('text-purple-400');
    expect(style.flameClass).toContain('drop-shadow');
    expect(style.cardClass).toContain('purple-400');
    expect(style.cardClass).toContain('via-fuchsia');
  });
});
