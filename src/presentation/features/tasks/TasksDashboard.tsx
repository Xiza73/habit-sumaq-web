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
import { FolderPlus, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

import {
  useDeleteSection,
  useReorderSections,
  useSections,
} from '@/core/application/hooks/use-sections';
import { useTasks } from '@/core/application/hooks/use-tasks';
import { type Section } from '@/core/domain/entities/section';
import { type Task } from '@/core/domain/entities/task';

import { ApiError } from '@/infrastructure/api/api-error';

import { ConfirmDialog } from '@/presentation/components/feedback/ConfirmDialog';

import { SectionColumn } from './SectionColumn';
import { SectionForm } from './SectionForm';
import { TaskForm } from './TaskForm';

/**
 * Top-level page for `/tasks`. Renders the user's sections (each with its
 * pending + completed tasks). Empty state when no sections exist routes the
 * user to "create your first section".
 *
 * Two DndContexts in play:
 *  - This component owns the section-reorder context (drag the section
 *    headers).
 *  - Each `SectionColumn` owns its own task-reorder context (drag tasks
 *    within a section). They don't conflict because `dnd-kit` events stay
 *    local to the nearest matching context.
 */
export function TasksDashboard() {
  const t = useTranslations('tasks');
  const tErrors = useTranslations('errors');

  const { data: sections = [], isLoading: sectionsLoading } = useSections();
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const reorderSectionsMutation = useReorderSections();
  const deleteSectionMutation = useDeleteSection();

  const [sectionFormOpen, setSectionFormOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskFormDefaultSection, setTaskFormDefaultSection] = useState<string | undefined>();
  const [pendingDeleteSection, setPendingDeleteSection] = useState<Section | null>(null);

  // Group tasks by section once per render. Sorted by position via the
  // backend's ordering — we just bucketize.
  const tasksBySection = useMemo(() => {
    const map = new Map<string, { pending: Task[]; completed: Task[] }>();
    for (const section of sections) {
      map.set(section.id, { pending: [], completed: [] });
    }
    for (const task of tasks) {
      const bucket = map.get(task.sectionId);
      if (!bucket) continue;
      (task.completed ? bucket.completed : bucket.pending).push(task);
    }
    return map;
  }, [sections, tasks]);

  const sectionSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleSectionDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = [...sections];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    reorderSectionsMutation.mutate(
      { orderedIds: reordered.map((s) => s.id) },
      { onError: () => toast.error(tErrors('generic')) },
    );
  }

  function openCreateSection() {
    setEditingSection(null);
    setSectionFormOpen(true);
  }

  function openEditSection(section: Section) {
    setEditingSection(section);
    setSectionFormOpen(true);
  }

  function openCreateTask(sectionId?: string) {
    setEditingTask(null);
    setTaskFormDefaultSection(sectionId);
    setTaskFormOpen(true);
  }

  function openEditTask(task: Task) {
    setEditingTask(task);
    setTaskFormDefaultSection(undefined);
    setTaskFormOpen(true);
  }

  function handleConfirmDeleteSection() {
    if (!pendingDeleteSection) return;
    deleteSectionMutation.mutate(pendingDeleteSection.id, {
      onSuccess: () => {
        toast.success(t('section.deleteSuccess'));
        setPendingDeleteSection(null);
      },
      onError: (error) => {
        toast.error(
          error instanceof ApiError && error.code && tErrors.has(error.code)
            ? tErrors(error.code as 'TSK_001')
            : tErrors('generic'),
        );
      },
    });
  }

  const isLoading = sectionsLoading || tasksLoading;
  const noSections = sections.length === 0;
  const taskCountInDeletingSection = pendingDeleteSection
    ? (tasksBySection.get(pendingDeleteSection.id)?.pending.length ?? 0) +
      (tasksBySection.get(pendingDeleteSection.id)?.completed.length ?? 0)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openCreateSection}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <FolderPlus className="size-4" />
            <span className="hidden sm:inline">{t('section.add')}</span>
          </button>
          <button
            type="button"
            onClick={() => openCreateTask()}
            disabled={noSections}
            // The "new task" button is gated by having at least one section.
            // Tooltip nudges the user toward creating one when they hover the
            // disabled button.
            title={noSections ? t('task.createNeedsSection') : undefined}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">{t('task.add')}</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : noSections ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FolderPlus className="size-8" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">{t('empty.title')}</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{t('empty.subtitle')}</p>
          <button
            type="button"
            onClick={openCreateSection}
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <FolderPlus className="size-4" />
            {t('empty.createFirst')}
          </button>
        </div>
      ) : (
        <DndContext
          sensors={sectionSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleSectionDragEnd}
        >
          <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {sections.map((section) => {
                const bucket = tasksBySection.get(section.id) ?? { pending: [], completed: [] };
                return (
                  <SectionColumn
                    key={section.id}
                    section={section}
                    pendingTasks={bucket.pending}
                    completedTasks={bucket.completed}
                    sortable={sections.length > 1}
                    onAddTask={openCreateTask}
                    onEditSection={openEditSection}
                    onDeleteSection={setPendingDeleteSection}
                    onEditTask={openEditTask}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <SectionForm
        open={sectionFormOpen}
        section={editingSection}
        onClose={() => setSectionFormOpen(false)}
      />
      <TaskForm
        open={taskFormOpen}
        task={editingTask}
        defaultSectionId={taskFormDefaultSection}
        sections={sections}
        onClose={() => setTaskFormOpen(false)}
      />
      <ConfirmDialog
        open={!!pendingDeleteSection}
        title={t('section.deleteTitle')}
        description={
          taskCountInDeletingSection > 0
            ? t('section.deleteDescriptionWithCount', { count: taskCountInDeletingSection })
            : t('section.deleteDescriptionEmpty')
        }
        variant="destructive"
        loading={deleteSectionMutation.isPending}
        onConfirm={handleConfirmDeleteSection}
        onCancel={() => setPendingDeleteSection(null)}
      />
    </div>
  );
}
