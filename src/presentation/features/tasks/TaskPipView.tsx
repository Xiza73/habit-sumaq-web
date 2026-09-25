'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Blend, X } from 'lucide-react';

import { usePipWindowSync } from '@/core/application/hooks/use-pip-window-sync';
import { tasksKeys, useTasks } from '@/core/application/hooks/use-tasks';

import { closeSelfPip } from '@/lib/pip-window';

import { TaskItem } from './TaskItem';

/** Dim levels the opacity button cycles through. Same three steps everywhere. */
const OPACITY_LEVELS = [1, 0.7, 0.4] as const;

/** What this window shows, and therefore what it refetches on a broadcast. */
const WATCHED_KEYS = [tasksKeys.all];

/**
 * The floating window's contents: the very same `TaskItem` from the board.
 *
 * Unlike the habit and chore popups this one needs a control strip of its own.
 * `TaskItem` is a ROW built for a column — it has no corner to host a close
 * button, and bolting one on would distort it for the board, where it belongs.
 *
 * The task comes from the full list rather than a query of its own: the API
 * has no endpoint for a single task, and inventing one for a popup that shows
 * a title and a status would be a lot of backend for very little.
 */
export function TaskPipView({ taskId }: { taskId: string }) {
  const tPip = useTranslations('pip');
  usePipWindowSync(WATCHED_KEYS);

  const { data: tasks, isLoading } = useTasks();
  const task = tasks?.find((t) => t.id === taskId);

  const [opacityStep, setOpacityStep] = useState(0);
  // Dimming only helps while the window is being ignored. The moment the
  // pointer arrives the user wants to READ and click it, so it goes solid.
  const [hovered, setHovered] = useState(false);

  if (isLoading) {
    return <div className="h-screen w-screen animate-pulse bg-card" />;
  }

  if (!task) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-card p-4 text-center text-sm text-muted-foreground">
        {tPip('notFound')}
      </div>
    );
  }

  return (
    // `data-tauri-drag-region="deep"` makes the whole surface a title bar the
    // window does not have. Tauri stops the drag at any clickable element, so
    // every control keeps working and only empty space moves the window.
    <div
      data-tauri-drag-region="deep"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ opacity: hovered ? 1 : OPACITY_LEVELS[opacityStep] }}
      className="flex h-screen w-screen flex-col overflow-hidden bg-card transition-opacity duration-200"
    >
      <div className="flex shrink-0 items-center justify-end gap-1 px-2 pt-2">
        <button
          type="button"
          onClick={() => setOpacityStep((step) => (step + 1) % OPACITY_LEVELS.length)}
          aria-label={tPip('opacity')}
          title={`${tPip('opacity')} — ${Math.round(OPACITY_LEVELS[opacityStep] * 100)}%`}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Blend className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => void closeSelfPip()}
          aria-label={tPip('close')}
          title={tPip('close')}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      {/*
        `TaskItem` calls `useSortable`, which reads a dnd-kit context. The
        board always has one; a lone window does not, so it is provided here
        with sorting disabled. Cheaper and far more honest than teaching the
        row to live without the library it was built on.

        Scrollable because the row expands to show its description, and the
        window cannot be resized by the user.
      */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <DndContext>
          <SortableContext items={[task.id]} strategy={verticalListSortingStrategy}>
            <TaskItem
              task={task}
              // No edit, no delete: this window is for moving the status
              // along, and the board is right there for the rest.
              onEdit={() => undefined}
              hideAdminActions
            />
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
