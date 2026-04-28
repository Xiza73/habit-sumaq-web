import { describe, expect, it } from 'vitest';

import { prefixLine, wrapSelection } from './markdown-input';

function makeTextarea(value: string, selectionStart = 0, selectionEnd = selectionStart) {
  const ta = document.createElement('textarea');
  ta.value = value;
  document.body.appendChild(ta);
  ta.focus();
  ta.setSelectionRange(selectionStart, selectionEnd);
  return ta;
}

describe('wrapSelection', () => {
  it('wraps the current selection with the marker on both sides', () => {
    const ta = makeTextarea('hello world', 6, 11); // "world" selected
    wrapSelection(ta, '**');
    expect(ta.value).toBe('hello **world**');
    // Selection still points at the wrapped word.
    expect(ta.value.slice(ta.selectionStart, ta.selectionEnd)).toBe('world');
  });

  it('places the cursor between markers when the selection is empty', () => {
    const ta = makeTextarea('write here:', 11);
    wrapSelection(ta, '*');
    expect(ta.value).toBe('write here:**');
    // Caret sits between the two stars.
    expect(ta.selectionStart).toBe(12);
    expect(ta.selectionEnd).toBe(12);
  });

  it('supports asymmetric markers (different `before` and `after`)', () => {
    const ta = makeTextarea('xy', 0, 2);
    wrapSelection(ta, '[', ']');
    expect(ta.value).toBe('[xy]');
  });
});

describe('prefixLine', () => {
  it('prefixes the line where the cursor is when there is no selection', () => {
    const ta = makeTextarea('first\nsecond\nthird', 'first\n'.length + 2); // inside "second"
    prefixLine(ta, '## ');
    expect(ta.value).toBe('first\n## second\nthird');
  });

  it('prefixes every line in a multi-line selection', () => {
    // Selection spans "second" and "third".
    const value = 'first\nsecond\nthird';
    const start = 'first\n'.length;
    const end = value.length;
    const ta = makeTextarea(value, start, end);
    prefixLine(ta, '- ');
    expect(ta.value).toBe('first\n- second\n- third');
  });

  it('removes the prefix when every targeted line already has it (toggle off)', () => {
    const ta = makeTextarea('## hello\n## world', 0, 'hello\n## world'.length);
    prefixLine(ta, '## ');
    expect(ta.value).toBe('hello\nworld');
  });

  it('toggles even when the cursor is just placed inside an already-prefixed line', () => {
    const ta = makeTextarea('## hello', 5);
    prefixLine(ta, '## ');
    expect(ta.value).toBe('hello');
  });

  it('handles cursor at the start of file', () => {
    const ta = makeTextarea('hello', 0);
    prefixLine(ta, '1. ');
    expect(ta.value).toBe('1. hello');
  });
});
