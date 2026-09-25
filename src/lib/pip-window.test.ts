import { describe, expect, it } from 'vitest';

import { canUsePip, openPipWindow, pipLabelFor } from './pip-window';

describe('pip-window', () => {
  it('is unavailable outside Tauri', () => {
    // jsdom is a browser, and a browser has no always-on-top OS window. Every
    // entry point has to be dead here, not merely hidden in the UI.
    expect(canUsePip()).toBe(false);
  });

  it('resolves to false instead of throwing when there is no Tauri', async () => {
    await expect(openPipWindow({ module: 'habits', id: 'habit-1', locale: 'es' })).resolves.toBe(
      false,
    );
  });

  it('builds a label Tauri will accept', () => {
    // Labels allow only alphanumerics, `-` and `_`. A UUID passes through;
    // anything else has to be stripped or window creation fails at runtime,
    // where it is far more expensive to notice.
    expect(pipLabelFor('habits', '550e8400-e29b-41d4-a716-446655440000')).toBe(
      'pip-habits-550e8400-e29b-41d4-a716-446655440000',
    );
    expect(pipLabelFor('chores', 'a b/c.d')).toBe('pip-chores-abcd');
  });

  it('labels the list popups by module alone', () => {
    // `priorities` and `reminders` show the whole list, so there is no id to
    // key on — and only one window each, which the label has to reflect or a
    // second click would open a duplicate instead of focusing the first.
    expect(pipLabelFor('priorities')).toBe('pip-priorities');
    expect(pipLabelFor('reminders')).toBe('pip-reminders');
  });

  it('keeps every module label under the capability glob', () => {
    // `capabilities/pip.json` grants permissions to `pip-*` and nothing else.
    // A label outside that prefix produces a window that cannot even close
    // itself.
    for (const mod of ['habits', 'chores', 'tasks', 'priorities', 'reminders'] as const) {
      expect(pipLabelFor(mod, 'x')).toMatch(/^pip-/);
      expect(pipLabelFor(mod)).toMatch(/^pip-/);
    }
  });
});
