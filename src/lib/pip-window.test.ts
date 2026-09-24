import { describe, expect, it } from 'vitest';

import { canUsePip, openHabitPip, pipLabelFor } from './pip-window';

describe('pip-window', () => {
  it('is unavailable outside Tauri', () => {
    // jsdom is a browser, and a browser has no always-on-top OS window. Every
    // entry point has to be dead here, not merely hidden in the UI.
    expect(canUsePip()).toBe(false);
  });

  it('resolves to false instead of throwing when there is no Tauri', async () => {
    await expect(openHabitPip('habit-1', 'es')).resolves.toBe(false);
  });

  it('builds a label Tauri will accept', () => {
    // Labels allow only alphanumerics, `-`, `_` and a couple of separators.
    // A UUID passes through; anything else has to be stripped or window
    // creation fails at runtime, where it is far more expensive to notice.
    expect(pipLabelFor('550e8400-e29b-41d4-a716-446655440000')).toBe(
      'pip-550e8400-e29b-41d4-a716-446655440000',
    );
    expect(pipLabelFor('a b/c.d')).toBe('pip-abcd');
  });
});
