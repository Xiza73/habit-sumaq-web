'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import { usePipWindowSync } from '@/core/application/hooks/use-pip-window-sync';
import { sectionsKeys, useSections } from '@/core/application/hooks/use-sections';
import { tasksKeys, useTasks } from '@/core/application/hooks/use-tasks';

import { PipShell } from '@/presentation/features/pip/PipShell';

import { TaskItem } from './TaskItem';

/** What this window shows, and therefore what it refetches on a broadcast. */
const WATCHED_KEYS = [tasksKeys.all, sectionsKeys.all];

/**
 * The floating window for one SECTION, with the tasks under it.
 *
 * A section is the unit worth popping out: a single task is a title and a
 * status, while the section is the list you actually work through. The window
 * mirrors the board's grouping — pending, in review, done — because a task
 * that moved to review and a task that is finished mean different things, and
 * flattening them here would lose exactly what the popup is for.
 */
export function SectionPipView({ sectionId }: { sectionId: string }) {
  const t = useTranslations('tasks');
  const tPip = useTranslations('pip');
  usePipWindowSync(WATCHED_KEYS);

  const { data: sections = [], isLoading: sectionsLoading } = useSections();
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();

  const section = sections.find((candidate) => candidate.id === sectionId);

  const { pending, inReview, completed } = useMemo(() => {
    const mine = tasks.filter((task) => task.sectionId === sectionId);
    return {
      pending: mine.filter((task) => task.status === 'PENDING'),
      inReview: mine.filter((task) => task.status === 'IN_REVIEW'),
      completed: mine.filter((task) => task.status === 'DONE'),
    };
  }, [tasks, sectionId]);

  if (sectionsLoading || tasksLoading) {
    return <div className="h-screen w-screen rounded-xl bg-card animate-pulse" />;
  }

  if (!section) {
    return (
      <div className="flex h-screen w-screen items-center justify-center rounded-xl bg-card p-4 text-center text-sm text-muted-foreground">
        {tPip('notFound')}
      </div>
    );
  }

  const isEmpty = pending.length === 0 && inReview.length === 0 && completed.length === 0;

  return (
    <PipShell title={section.name}>
      {isEmpty ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t('section.emptyTasks')}</p>
      ) : (
        <div className="space-y-3">
          {/*
            `TaskItem` calls `useSortable`, which reads a dnd-kit context. The
            board always has one; a lone window does not, so it is provided
            here with sorting off — reordering by dragging inside a window
            whose empty space drags the window itself would fight it.
          */}
          <DndContext>
            <SortableContext
              items={pending.map((task) => task.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {pending.map((task) => (
                  // No edit, no delete: this window is for moving the status
                  // along, and the board is right there for the rest.
                  <TaskItem key={task.id} task={task} onEdit={() => undefined} hideAdminActions />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {inReview.length > 0 && (
            <div className="space-y-2 border-t border-dashed border-border pt-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {t('section.inReview')}
              </p>
              {inReview.map((task) => (
                <TaskItem key={task.id} task={task} onEdit={() => undefined} hideAdminActions />
              ))}
            </div>
          )}

          {completed.length > 0 && (
            <div className="space-y-2 border-t border-border pt-3">
              {completed.map((task) => (
                <TaskItem key={task.id} task={task} onEdit={() => undefined} hideAdminActions />
              ))}
            </div>
          )}
        </div>
      )}
    </PipShell>
  );
}
