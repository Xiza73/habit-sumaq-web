import { isTauri } from '@tauri-apps/api/core';

/**
 * Floating always-on-top windows — the desktop-only "picture in picture".
 *
 * Browser-only concepts do not apply here: these are real OS windows, so they
 * survive the main window being minimised or covered, which is the entire
 * point. `isTauri()` gates every entry point, so the web build simply never
 * offers it.
 */

/**
 * Modules that can be popped out.
 *
 * Some open one window per item (`habits`, `chores`, `tasks`); others open a
 * single window showing the whole list (`priorities`, `reminders`). The
 * difference is just whether an `id` is passed — the window machinery does not
 * care either way.
 */
export const PIP_MODULES = ['habits', 'chores', 'tasks', 'priorities', 'reminders'] as const;

export type PipModule = (typeof PIP_MODULES)[number];

/** Label prefix. The `pip` capability grants permissions to `pip-*` ONLY. */
const LABEL_PREFIX = 'pip-';

export interface PipSize {
  width: number;
  height: number;
}

const DEFAULT_SIZE: PipSize = { width: 340, height: 190 };

/**
 * Size for the popups that show a whole list instead of one item. Same width —
 * the rows are the same rows — with room for a handful of them.
 */
export const PIP_LIST_SIZE: PipSize = { width: 340, height: 420 };

/**
 * Size for the chore popup. A chore card carries more rows than a habit one —
 * cadence, next date, last done, notes — and then its action footer, which at
 * the default height fell outside the window: the buttons rendered and were
 * simply clipped, so the card looked like it would not let you mark anything
 * done.
 */
export const PIP_CHORE_SIZE: PipSize = { width: 340, height: 320 };

/**
 * Broadcast after any write that a floating window might be showing.
 *
 * Deliberately ONE event with no payload. Each window is its own webview and
 * therefore its own TanStack cache, so a check-in in the popup would otherwise
 * leave the main window on a stale count — two numbers for the same row, both
 * on screen.
 *
 * Per-module events would save the odd refetch in a window whose data did not
 * change, and would buy that with a whole class of "nobody emitted for module
 * X" bugs. With a handful of windows open at most, the refetch is free and the
 * bug is impossible.
 */
export const PIP_CHANGED_EVENT = 'pip:changed';

export function pipLabelFor(module: PipModule, id?: string): string {
  // Tauri window labels allow only alphanumerics, `-`, `/`, `:` and `_`.
  const suffix = id ? `-${id.replace(/[^a-zA-Z0-9\-_]/g, '')}` : '';
  return `${LABEL_PREFIX}${module}${suffix}`;
}

export function canUsePip(): boolean {
  return isTauri();
}

interface OpenPipOptions {
  module: PipModule;
  /** Omitted by the modules whose popup shows the whole list. */
  id?: string;
  locale: string;
  size?: PipSize;
}

/**
 * Opens (or focuses, if already open) a floating window.
 *
 * Returns false when the window could not be created. That is not a
 * theoretical branch: the desktop shell loads the deployed site, so a user on
 * an older installer gets this code with a Tauri build whose capabilities do
 * not allow creating windows. Failing loudly beats a button that does nothing.
 */
export async function openPipWindow({
  module,
  id,
  locale,
  size = DEFAULT_SIZE,
}: OpenPipOptions): Promise<boolean> {
  if (!canUsePip()) return false;

  try {
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
    const label = pipLabelFor(module, id);

    const existing = await WebviewWindow.getByLabel(label);
    if (existing) {
      await existing.setFocus();
      return true;
    }

    const path = id ? `/pip/${module}/${id}` : `/pip/${module}`;
    const win = new WebviewWindow(label, {
      url: `${path}?locale=${encodeURIComponent(locale)}`,
      width: size.width,
      height: size.height,
      resizable: false,
      // No title bar: the content IS the window. The whole surface is a drag
      // region instead.
      decorations: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      // Transparent so the content can be dimmed with plain CSS alpha. Tauri
      // has no window-opacity API at all — `setEffects` is blur, not alpha —
      // so an opaque window can only ever be painted over, never seen through.
      //
      // On macOS this needs `macOSPrivateApi` in tauri.conf.json, which rules
      // the app out of the Mac App Store. Distribution here is GitHub
      // Releases, so that costs nothing.
      transparent: true,
      shadow: false,
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
 * Grows or shrinks THIS window.
 *
 * A popup opens sized to its collapsed content. Revealing anything below it
 * without this would render past the bottom edge of a non-resizable window —
 * present in the DOM, invisible on screen.
 */
export async function resizeSelfPip(size: PipSize): Promise<void> {
  if (!canUsePip()) return;
  try {
    const [{ getCurrentWebviewWindow }, { LogicalSize }] = await Promise.all([
      import('@tauri-apps/api/webviewWindow'),
      import('@tauri-apps/api/dpi'),
    ]);
    await getCurrentWebviewWindow().setSize(new LogicalSize(size.width, size.height));
  } catch {
    // A window that will not resize is a cosmetic problem; throwing here would
    // take the whole popup down over it.
  }
}

/** Closes the window this code is running in. Used by a popup's own X. */
export async function closeSelfPip(): Promise<void> {
  if (!canUsePip()) return;
  const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
  await getCurrentWebviewWindow().close();
}
