/**
 * Tiny helpers for applying markdown shortcuts to a textarea — called by the
 * toolbar buttons. They mutate the textarea's value via `setRangeText` so the
 * native `input` event fires and any `onChange`-driven controlled state (e.g.
 * react-hook-form) sees the update.
 *
 * After the call:
 * - For `wrapSelection` with a non-empty selection, the wrapped text remains
 *   selected (the user can hit the same shortcut again to remove it).
 * - For `wrapSelection` with an empty cursor, the cursor lands BETWEEN the
 *   markers so the user just types what should be wrapped.
 * - For `prefixLine`, the cursor lands at the end of the prefixed line.
 */

function dispatchInputEvent(el: HTMLTextAreaElement) {
  // `setRangeText` updates the value but does NOT fire an `input` event in
  // every engine. Dispatch one manually so controlled components react.
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Wraps the current selection with `before` / `after` markers. If there's no
 * selection, drops the markers around the cursor and places the caret in the
 * middle.
 */
export function wrapSelection(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string = before,
): void {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.slice(start, end);

  const replacement = `${before}${selected}${after}`;
  textarea.setRangeText(replacement, start, end, 'select');

  if (selected.length === 0) {
    // Nothing was selected — leave the cursor between the two markers so the
    // user types the wrapped content.
    const caret = start + before.length;
    textarea.setSelectionRange(caret, caret);
  } else {
    // Keep the wrapped text selected so the user can toggle it off.
    textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
  }

  textarea.focus();
  dispatchInputEvent(textarea);
}

/**
 * Adds `prefix` at the start of the line the cursor is on. If the user has a
 * multi-line selection, prefixes every line.
 *
 * Smart toggle: if every targeted line ALREADY starts with `prefix`, removes
 * it instead — same UX you get in most markdown editors when you tap the
 * heading / list button on a line that's already been formatted.
 */
export function prefixLine(textarea: HTMLTextAreaElement, prefix: string): void {
  const value = textarea.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;

  // Expand the selection to whole lines.
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const nextNewline = value.indexOf('\n', end);
  const lineEnd = nextNewline === -1 ? value.length : nextNewline;

  const block = value.slice(lineStart, lineEnd);
  const lines = block.split('\n');
  const allHavePrefix = lines.every((l) => l.startsWith(prefix));

  const newBlock = allHavePrefix
    ? lines.map((l) => l.slice(prefix.length)).join('\n')
    : lines.map((l) => `${prefix}${l}`).join('\n');

  textarea.setRangeText(newBlock, lineStart, lineEnd, 'preserve');

  // Keep the same selection range (relative to the block) — the user can
  // keep typing without losing context.
  const delta = allHavePrefix ? -prefix.length : prefix.length;
  const newStart = Math.max(lineStart, start + delta);
  const newEnd = end + delta * lines.length;
  textarea.setSelectionRange(newStart, Math.max(newEnd, newStart));

  textarea.focus();
  dispatchInputEvent(textarea);
}
