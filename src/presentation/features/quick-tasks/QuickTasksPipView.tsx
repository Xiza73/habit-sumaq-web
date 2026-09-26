'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import { usePipWindowSync } from '@/core/application/hooks/use-pip-window-sync';
import { quickTasksKeys, useQuickTasks } from '@/core/application/hooks/use-quick-tasks';

import { PipShell } from '@/presentation/features/pip/PipShell';

import { QuickTaskItem } from './QuickTaskItem';

/** What this window shows, and therefore what it refetches on a broadcast. */
const WATCHED_KEYS = [quickTasksKeys.all];

/**
 * The floating window for priorities: the whole list, not one per item.
 *
 * A priority is a single line with a checkbox — one window each would be five
 * windows to glance at the same five lines. The per-item popups exist where an
 * item carries enough on its own to be worth a window.
 *
 * Rows come from `QuickTaskItem`, the same component the page uses.
 */
export function QuickTasksPipView() {
  const t = useTranslations('quickTasks');
  usePipWindowSync(WATCHED_KEYS);

  const { data: tasks = [], isLoading } = useQuickTasks();

  const { pending, completed } = useMemo(
    () => ({
      pending: tasks.filter((task) => !task.completed),
      completed: tasks.filter((task) => task.completed),
    }),
    [tasks],
  );

  if (isLoading) {
    return <div className="h-screen w-screen animate-pulse bg-card" />;
  }

  return (
    <PipShell title={t('title')}>
      {tasks.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t('emptyState')}</p>
      ) : (
        <div className="space-y-3">
          {/*
            `QuickTaskItem` calls `useSortable`, which reads a dnd-kit context.
            The page always has one; a lone window does not, so it is provided
            here — with `sortable` left off, because reordering by dragging
            inside a window whose whole surface is a drag region would fight
            the window itself.
          */}
          <DndContext>
            <SortableContext
              items={pending.map((task) => task.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {pending.map((task) => (
                  // No onEdit: this window is for ticking things off, and the
                  // page is right there for the rest.
                  <QuickTaskItem
                    key={task.id}
                    task={task}
                    onEdit={() => undefined}
                    hideAdminActions
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {completed.length > 0 && (
            <div className="space-y-2 border-t border-border pt-3">
              {completed.map((task) => (
                <QuickTaskItem
                  key={task.id}
                  task={task}
                  onEdit={() => undefined}
                  hideAdminActions
                />
              ))}
            </div>
          )}
        </div>
      )}
    </PipShell>
  );
}
