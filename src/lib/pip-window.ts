import { isTauri } from '@tauri-apps/api/core';

/**
 * Floating always-on-top windows for a single habit — the desktop-only
 * "picture in picture".
 *
 * Browser-only concepts do not apply here: this is a real OS window, so it
 * survives the main window being minimised or covered, which is the entire
 * point. `isTauri()` gates every entry point, so the web build simply never
 * offers it.
 */

/** Label prefix. The `pip` capability grants permissions to `pip-*` ONLY. */
const LABEL_PREFIX = 'pip-';

/** Card width plus the window chrome we removed; tuned to the card at p-5. */
const WIDTH = 340;
const HEIGHT = 260;

/**
 * Broadcast after any habit write, in either direction.
 *
 * Each window is its own webview, which means its own TanStack Query cache.
 * Checking in from the popup would otherwise leave the main window showing a
 * count the server no longer agrees with — and the user staring at two numbers
 * for the same habit.
 */
export const HABITS_CHANGED_EVENT = 'habits:changed';

export function pipLabelFor(habitId: string): string {
  // Tauri window labels allow only alphanumerics, `-`, `/`, `:` and `_`.
  return `${LABEL_PREFIX}${habitId.replace(/[^a-zA-Z0-9\-_]/g, '')}`;
}

export function canUsePip(): boolean {
  return isTauri();
}

/**
 * Opens (or focuses, if already open) the floating window for a habit.
 *
 * Returns false when the window could not be created. That is not a
 * theoretical branch: the desktop shell loads the deployed site, so a user on
 * an older installer gets this code with a Tauri build whose capabilities do
 * not allow creating windows. Failing loudly beats a button that does nothing.
 */
export async function openHabitPip(habitId: string, locale: string): Promise<boolean> {
  if (!canUsePip()) return false;

  try {
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
    const label = pipLabelFor(habitId);

    const existing = await WebviewWindow.getByLabel(label);
    if (existing) {
      await existing.setFocus();
      return true;
    }

    const win = new WebviewWindow(label, {
      url: `/pip/habits/${habitId}?locale=${encodeURIComponent(locale)}`,
      width: WIDTH,
      height: HEIGHT,
      resizable: false,
      // No title bar: the card IS the window. The thick bottom strip and the
      // card's own header double as the drag handle.
      decorations: false,
      // Transparent so the card can be dimmed with plain CSS alpha. Tauri has
      // no window-opacity API at all — `setEffects` is blur, not alpha — so an
      // opaque window can only ever be painted over, never seen through.
      //
      // On macOS this needs `macOSPrivateApi` in tauri.conf.json, which rules
      // the app out of the Mac App Store. Distribution here is GitHub
      // Releases, so that costs nothing.
      transparent: true,
      shadow: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      title: 'Habit Sumaq',
    });

    await new Promise<void>((resolve, reject) => {
      void win.once('tauri://created', () => resolve());
      void win.once('tauri://error', (e) => reject(new Error(String(e.payload))));
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * Grows or shrinks THIS window to a new height, keeping the width.
 *
 * The popup opens sized to the card. Revealing the timer strip without this
 * would render it past the bottom edge of a non-resizable window — present in
 * the DOM, invisible on screen.
 */
export async function resizeSelfPip(height: number): Promise<void> {
  if (!canUsePip()) return;
  try {
    const [{ getCurrentWebviewWindow }, { LogicalSize }] = await Promise.all([
      import('@tauri-apps/api/webviewWindow'),
      import('@tauri-apps/api/dpi'),
    ]);
    await getCurrentWebviewWindow().setSize(new LogicalSize(WIDTH, height));
  } catch {
    // A window that will not resize is a cosmetic problem; throwing here would
    // take the whole popup down over it.
  }
}

/** Closes the window this code is running in. Used by the popup's own X. */
export async function closeSelfPip(): Promise<void> {
  if (!canUsePip()) return;
  const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
  await getCurrentWebviewWindow().close();
}
