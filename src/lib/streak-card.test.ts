import { describe, expect, it } from 'vitest';

import { buildStreakCardSvg, pickStreakPhraseKey } from './streak-card';

describe('pickStreakPhraseKey', () => {
  it('returns starting tier for days < 7', () => {
    expect(pickStreakPhraseKey(0)).toMatch(/^starting/);
    expect(pickStreakPhraseKey(1)).toMatch(/^starting/);
    expect(pickStreakPhraseKey(6)).toMatch(/^starting/);
  });

  it('returns week tier for 7-13 days', () => {
    expect(pickStreakPhraseKey(7)).toMatch(/^week/);
    expect(pickStreakPhraseKey(13)).toMatch(/^week/);
  });

  it('returns twoWeeks tier for 14-29 days', () => {
    expect(pickStreakPhraseKey(14)).toMatch(/^twoWeeks/);
    expect(pickStreakPhraseKey(29)).toMatch(/^twoWeeks/);
  });

  it('returns month tier for 30-59 days', () => {
    expect(pickStreakPhraseKey(30)).toMatch(/^month/);
    expect(pickStreakPhraseKey(59)).toMatch(/^month/);
  });

  it('returns twoMonths tier for 60-89 days', () => {
    expect(pickStreakPhraseKey(60)).toMatch(/^twoMonths/);
    expect(pickStreakPhraseKey(89)).toMatch(/^twoMonths/);
  });

  it('returns quarter tier for 90-179 days', () => {
    expect(pickStreakPhraseKey(90)).toMatch(/^quarter/);
    expect(pickStreakPhraseKey(179)).toMatch(/^quarter/);
  });

  it('returns halfYear tier for 180-364 days', () => {
    expect(pickStreakPhraseKey(180)).toMatch(/^halfYear/);
    expect(pickStreakPhraseKey(364)).toMatch(/^halfYear/);
  });

  it('returns year tier for 365+ days', () => {
    expect(pickStreakPhraseKey(365)).toMatch(/^year/);
    expect(pickStreakPhraseKey(1000)).toMatch(/^year/);
  });

  it('rotates variant deterministically by days % 3', () => {
    // 30 % 3 == 0 → variant 1
    expect(pickStreakPhraseKey(30)).toBe('month1');
    // 31 % 3 == 1 → variant 2
    expect(pickStreakPhraseKey(31)).toBe('month2');
    // 32 % 3 == 2 → variant 3
    expect(pickStreakPhraseKey(32)).toBe('month3');
    // 33 % 3 == 0 → variant 1 again
    expect(pickStreakPhraseKey(33)).toBe('month1');
  });

  it('is fully deterministic — same input → same output', () => {
    for (let d = 0; d < 500; d++) {
      expect(pickStreakPhraseKey(d)).toBe(pickStreakPhraseKey(d));
    }
  });
});

describe('buildStreakCardSvg', () => {
  const baseParams = {
    days: 30,
    habitName: 'Leer 30 minutos',
    daysLabel: 'días',
    phrase: 'Un mes completo. Esto ya es parte de ti.',
    branding: 'Habit Sumaq',
  };

  it('returns a valid SVG root with the correct viewBox', () => {
    const svg = buildStreakCardSvg(baseParams);
    expect(svg).toMatch(/^<svg\s/);
    expect(svg).toContain('viewBox="0 0 1080 1080"');
    expect(svg).toContain('width="1080"');
    expect(svg).toContain('height="1080"');
  });

  it('embeds the streak number prominently', () => {
    const svg = buildStreakCardSvg(baseParams);
    expect(svg).toContain('>30</text>');
  });

  it('embeds the habit name, days label, phrase, and branding', () => {
    const svg = buildStreakCardSvg(baseParams);
    expect(svg).toContain('Leer 30 minutos');
    expect(svg).toContain('días');
    expect(svg).toContain('Habit Sumaq');
    // Phrase appears, possibly across multiple text elements when wrapped.
    expect(svg).toMatch(/Un mes completo\./);
  });

  it('uses the three-stop brand gradient by default (green → cyan → indigo)', () => {
    const svg = buildStreakCardSvg(baseParams);
    expect(svg).toContain('stop-color="#16a34a"'); // start
    expect(svg).toContain('stop-color="#0891b2"'); // mid
    expect(svg).toContain('stop-color="#1e3a8a"'); // end
  });

  it('overrides the start color when accentColor is provided', () => {
    const svg = buildStreakCardSvg({ ...baseParams, accentColor: '#FF6B35' });
    expect(svg).toContain('stop-color="#FF6B35"');
    // Mid + end stops stay locked to the brand ramp so the card still
    // reads as Habit Sumaq even with a custom accent.
    expect(svg).toContain('stop-color="#0891b2"');
    expect(svg).toContain('stop-color="#1e3a8a"');
  });

  it('embeds the brand logo paths instead of a placeholder glyph', () => {
    const svg = buildStreakCardSvg(baseParams);
    // The first path of public/logo/logo_lg.svg (the "H" mark) starts
    // with these coords — confirms we inlined the real brand mark.
    expect(svg).toContain('M263.53,178.46');
    // The v1 sparkle glyph is gone.
    expect(svg).not.toContain('✦');
  });

  it('XML-escapes habit names with special characters', () => {
    const svg = buildStreakCardSvg({
      ...baseParams,
      habitName: 'Read <books> & "stuff"',
    });
    expect(svg).not.toContain('<books>');
    expect(svg).toContain('&lt;books&gt;');
    expect(svg).toContain('&amp;');
    expect(svg).toContain('&quot;');
  });

  it('truncates very long habit names with an ellipsis', () => {
    const longName = 'A'.repeat(40);
    const svg = buildStreakCardSvg({ ...baseParams, habitName: longName });
    expect(svg).toContain('…');
    // The full 40-char name should not be there.
    expect(svg).not.toMatch(/A{40}/);
  });

  it('wraps long phrases into two lines', () => {
    const longPhrase =
      'Esta es una frase realmente larga que debería partirse en dos líneas para no salirse';
    const svg = buildStreakCardSvg({ ...baseParams, phrase: longPhrase });
    // Two italic <text> elements (one per line). Regex matches the
    // opening tag only, since the new quote-decoration behavior means
    // line 2 doesn't start with `"`.
    const phraseTexts = svg.match(/<text [^>]*font-style="italic"[^>]*>/g) ?? [];
    expect(phraseTexts.length).toBe(2);
  });

  it('keeps short phrases on a single line', () => {
    const shortPhrase = 'Día a día.';
    const svg = buildStreakCardSvg({ ...baseParams, phrase: shortPhrase });
    const phraseTexts = svg.match(/<text [^>]*font-style="italic"[^>]*>/g) ?? [];
    expect(phraseTexts.length).toBe(1);
  });

  it('puts opening quote on line 1 and closing quote on the last line only', () => {
    const longPhrase =
      'Esta es una frase realmente larga que debería partirse en dos líneas para no salirse';
    const svg = buildStreakCardSvg({ ...baseParams, phrase: longPhrase });

    const phraseLines = [...svg.matchAll(/<text [^>]*font-style="italic"[^>]*>(.*?)<\/text>/g)].map(
      (m) => m[1],
    );

    expect(phraseLines.length).toBe(2);
    // First line opens the quote but does NOT close it.
    expect(phraseLines[0]?.startsWith('"')).toBe(true);
    expect(phraseLines[0]?.endsWith('"')).toBe(false);
    // Last line closes the quote but does NOT open another one.
    expect(phraseLines[1]?.endsWith('"')).toBe(true);
    expect(phraseLines[1]?.startsWith('"')).toBe(false);
  });

  it('wraps single-line phrases with a balanced pair of quotes', () => {
    const shortPhrase = 'Día a día.';
    const svg = buildStreakCardSvg({ ...baseParams, phrase: shortPhrase });

    const phraseLines = [...svg.matchAll(/<text [^>]*font-style="italic"[^>]*>(.*?)<\/text>/g)].map(
      (m) => m[1],
    );

    expect(phraseLines.length).toBe(1);
    expect(phraseLines[0]?.startsWith('"')).toBe(true);
    expect(phraseLines[0]?.endsWith('"')).toBe(true);
  });

  it('balances the wrap split close to the middle of the phrase', () => {
    // 38 chars — split should happen near char ~19. Closest space is
    // between "La" and "consistencia" at index 14.
    const phrase = 'Siete días. La consistencia te define.';
    const svg = buildStreakCardSvg({ ...baseParams, phrase });

    const phraseLines = [...svg.matchAll(/<text [^>]*font-style="italic"[^>]*>(.*?)<\/text>/g)].map(
      (m) => m[1],
    );

    expect(phraseLines.length).toBe(2);
    // Line 1 has the "first half", line 2 has the rest. Both halves
    // should be substantial (no "define." alone on its own line).
    expect(phraseLines[0]).toContain('Siete días.');
    expect(phraseLines[1]).toContain('define.');
  });
});
