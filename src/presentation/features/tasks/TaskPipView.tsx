'use client';

import { useTranslations } from 'next-intl';

import { DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import { usePipWindowSync } from '@/core/application/hooks/use-pip-window-sync';
import { tasksKeys, useTasks } from '@/core/application/hooks/use-tasks';

import { PipShell } from '@/presentation/features/pip/PipShell';

import { TaskItem } from './TaskItem';

/** What this window shows, and therefore what it refetches on a broadcast. */
const WATCHED_KEYS = [tasksKeys.all];

/**
 * The floating window's contents: the very same `TaskItem` from the board.
 *
 * `TaskItem` is a ROW built for a column — it has no corner to host a close
 * button, and bolting one on would distort it for the board, where it belongs.
 * So the window chrome comes from `PipShell` instead.
 *
 * The task comes from the full list rather than a query of its own: the API
 * has no endpoint for a single task, and inventing one for a popup that shows
 * a title and a status would be a lot of backend for very little.
 */
export function TaskPipView({ taskId }: { taskId: string }) {
  const tPip = useTranslations('pip');
  usePipWindowSync(WATCHED_KEYS);

  const { data: tasks, isLoading } = useTasks();
  const task = tasks?.find((candidate) => candidate.id === taskId);

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
    <PipShell>
      {/*
        `TaskItem` calls `useSortable`, which reads a dnd-kit context. The
        board always has one; a lone window does not, so it is provided here
        with sorting disabled. Cheaper and far more honest than teaching the
        row to live without the library it was built on.
      */}
      <DndContext>
        <SortableContext items={[task.id]} strategy={verticalListSortingStrategy}>
          <TaskItem
            task={task}
            // No edit, no delete: this window is for moving the status along,
            // and the board is right there for the rest.
            onEdit={() => undefined}
            hideAdminActions
          />
        </SortableContext>
      </DndContext>
    </PipShell>
  );
}
