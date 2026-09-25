'use client';

import { useTranslations } from 'next-intl';

import {
  choreKeys,
  useChore,
  useMarkChoreDone,
  useSkipChoreCycle,
} from '@/core/application/hooks/use-chores';
import { usePipWindowSync } from '@/core/application/hooks/use-pip-window-sync';

import { PipOpacityButton, usePipOpacity } from '@/presentation/features/pip/PipOpacity';

import { closeSelfPip } from '@/lib/pip-window';

import { ChoreCard } from './ChoreCard';

/** What this window shows, and therefore what it refetches on a broadcast. */
const WATCHED_KEYS = [choreKeys.all];

/**
 * The floating window's contents: the very same `ChoreCard`.
 *
 * It renders `ChoreCard` rather than a lookalike on purpose — a second copy
 * would drift from the original the first time either was touched, which is
 * exactly the failure the chore status colours already had.
 */
export function ChorePipView({ choreId }: { choreId: string }) {
  const tPip = useTranslations('pip');
  usePipWindowSync(WATCHED_KEYS);

  const { data: chore, isLoading } = useChore(choreId);
  const markDone = useMarkChoreDone();
  const skipCycle = useSkipChoreCycle();

  const opacity = usePipOpacity();

  if (isLoading) {
    return <div className="h-screen w-screen animate-pulse bg-card" />;
  }

  if (!chore) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-card p-4 text-center text-sm text-muted-foreground">
        {tPip('notFound')}
      </div>
    );
  }

  return (
    // `bg-card`, not `bg-background`: the card IS the window, so anything
    // showing through would read as a border nobody asked for.
    //
    // `data-tauri-drag-region="deep"` makes the whole surface a title bar the
    // window does not have. Tauri stops the drag at any clickable element, so
    // every control keeps working and only empty space moves the window.
    <div
      data-tauri-drag-region="deep"
      onMouseEnter={opacity.onMouseEnter}
      onMouseLeave={opacity.onMouseLeave}
      style={{ opacity: opacity.value }}
      className="flex h-screen w-screen flex-col overflow-hidden bg-card transition-opacity duration-200"
    >
      <ChoreCard
        chore={chore}
        // The date is optional and the backend defaults it to today, so the
        // popup marks done outright. The list opens a form because it also
        // back-fills a past date and takes a note — neither fits in 340px, and
        // neither is what you popped the card out to do.
        onMarkDone={() => markDone.mutate({ id: chore.id, data: {} })}
        onSkip={() => skipCycle.mutate(chore.id)}
        // No onEdit / onArchive / onDelete / onViewHistory on purpose, which is
        // what drops the overflow menu and leaves the close button in its
        // place. Administering a chore from a chrome-less always-on-top window
        // is one misclick from destructive, and the main window is right there.
        onClosePip={() => void closeSelfPip()}
        headerActions={<PipOpacityButton level={opacity.level} onClick={opacity.cycle} />}
        // Edge to edge: no rounding, no border, filling whatever height is
        // left. Leftover space would otherwise show as a slab of background
        // under the card.
        className="min-h-0 flex-1 rounded-none border-0 hover:shadow-none"
      />
    </div>
  );
}
