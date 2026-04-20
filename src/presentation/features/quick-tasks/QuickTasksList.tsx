'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { useQuickTasks, useReorderQuickTasks } from '@/core/application/hooks/use-quick-tasks';
import { type QuickTask } from '@/core/domain/entities/quick-task';

import { QuickTaskForm } from './QuickTaskForm';
import { QuickTaskItem } from './QuickTaskItem';

export function QuickTasksList() {
  const t = useTranslations('quickTasks');
  const tErrors = useTranslations('errors');

  const { data: tasks = [], isLoading } = useQuickTasks();
  const reorderMutation = useReorderQuickTasks();

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<QuickTask | null>(null);

  const { pending, completed } = useMemo(() => {
    const pendingList = tasks.filter((t) => !t.completed);
    const completedList = tasks.filter((t) => t.completed);
    return { pending: pendingList, completed: completedList };
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = pending.findIndex((t) => t.id === active.id);
    const newIndex = pending.findIndex((t) => t.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = [...pending];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    reorderMutation.mutate(
      { orderedIds: reordered.map((t) => t.id) },
      {
        // The hook rolls back the optimistic cache update; we just surface
        // the failure so the user knows why the cards snapped back.
        onError: () => toast.error(tErrors('generic')),
      },
    );
  }

  function openCreateForm() {
    setEditingTask(null);
    setFormOpen(true);
  }

  function openEditForm(task: QuickTask) {
    setEditingTask(task);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingTask(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">{t('createTask')}</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <p className="max-w-sm text-muted-foreground">{t('emptyState')}</p>
        </div>
      ) : (
        <div className="space-y-8">
          <section className="space-y-2">
            <header className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t('pending')}
              </h2>
              <span className="text-xs text-muted-foreground">{pending.length}</span>
            </header>

            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('pendingEmpty')}</p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={pending.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {pending.map((task) => (
                      <QuickTaskItem key={task.id} task={task} sortable onEdit={openEditForm} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </section>

          {completed.length > 0 && (
            <section className="space-y-2">
              <header className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('completedToday')}
                </h2>
                <span className="text-xs text-muted-foreground">{completed.length}</span>
              </header>
              <div className="space-y-2">
                {completed.map((task) => (
                  <QuickTaskItem key={task.id} task={task} onEdit={openEditForm} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <QuickTaskForm open={formOpen} task={editingTask} onClose={closeForm} />
    </div>
  );
}
