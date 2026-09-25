'use client';

import { choreKeys } from '@/core/application/hooks/use-chores';
import { habitKeys } from '@/core/application/hooks/use-habits';
import { usePipWindowSync } from '@/core/application/hooks/use-pip-window-sync';
import { tasksKeys } from '@/core/application/hooks/use-tasks';
import { userSettingsKeys } from '@/core/application/hooks/use-user-settings';

/**
 * Mount point for the cross-window sync in the MAIN window. Renders nothing.
 *
 * Lists every key a floating window can move. Settings rides along because the
 * shield stock lives there and a popup can spend one.
 *
 * As modules gain popups, their keys join this list — the popups themselves
 * subscribe to their own.
 */
const WATCHED_KEYS = [habitKeys.all, choreKeys.all, tasksKeys.all, userSettingsKeys.all];

export function PipWindowSync() {
  usePipWindowSync(WATCHED_KEYS);
  return null;
}
