'use client';

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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { useReorderTasks } from '@/core/application/hooks/use-tasks';
import { type Section } from '@/core/domain/entities/section';
import { type Task } from '@/core/domain/entities/task';

import { TaskItem } from './TaskItem';

interface SectionColumnProps {
  section: Section;
  pendingTasks: Task[];
  completedTasks: Task[];
  /** True when the parent dashboard is rendering inside a sortable section context. */
  sortable: boolean;
  onAddTask: (sectionId: string) => void;
  onEditSection: (section: Section) => void;
  onDeleteSection: (section: Section) => void;
  onEditTask: (task: Task) => void;
}

/**
 * One section's worth of UI: header (drag handle + color swatch + name + actions)
 * plus its task list. The task list has its OWN nested DndContext so
 * within-section reorders don't bubble to the parent (sections) DndContext.
 *
 * Completed tasks render below pending tasks (separator) and are NOT sortable —
 * matches the quick-tasks pattern. They'll cleanup at week boundary anyway.
 */
export function SectionColumn({
  section,
  pendingTasks,
  completedTasks,
  sortable,
  onAddTask,
  onEditSection,
  onDeleteSection,
  onEditTask,
}: SectionColumnProps) {
  const t = useTranslations('tasks');
  const tErrors = useTranslations('errors');

  const reorderMutation = useReorderTasks();

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
    disabled: !sortable,
  });

  const containerStyle = sortable
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : undefined,
      }
    : undefined;

  const taskSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleTaskDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = pendingTasks.findIndex((t) => t.id === active.id);
    const newIndex = pendingTasks.findIndex((t) => t.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = [...pendingTasks];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    reorderMutation.mutate(
      { sectionId: section.id, orderedIds: reordered.map((t) => t.id) },
      {
        onError: () => toast.error(tErrors('generic')),
      },
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={containerStyle}
      className="rounded-xl border border-border bg-card"
    >
      <header className="flex items-center gap-2 border-b border-border px-3 py-2.5 sm:px-4">
        {sortable && (
          <button
            type="button"
            aria-label={t('section.dragHandle')}
            {...attributes}
            {...listeners}
            className="-ml-1 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          >
            <GripVertical className="size-4" />
          </button>
        )}
        {section.color && (
          <span
            className="size-3 shrink-0 rounded-full border border-border"
            style={{ backgroundColor: section.color }}
            aria-hidden
          />
        )}
        <h2 className="flex-1 truncate text-sm font-semibold">{section.name}</h2>
        <span className="text-xs text-muted-foreground">
          {pendingTasks.length}
          {completedTasks.length > 0 && ` · ${completedTasks.length} ✓`}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onAddTask(section.id)}
            aria-label={t('task.add')}
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Plus className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onEditSection(section)}
            aria-label={t('section.edit')}
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteSection(section)}
            aria-label={t('section.delete')}
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </header>

      <div className="space-y-2 p-3 sm:p-4">
        {pendingTasks.length === 0 && completedTasks.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            {t('section.emptyTasks')}
          </p>
        ) : (
          <>
            {pendingTasks.length > 0 && (
              <DndContext
                sensors={taskSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleTaskDragEnd}
              >
                <SortableContext
                  items={pendingTasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {pendingTasks.map((task) => (
                      <TaskItem key={task.id} task={task} sortable onEdit={onEditTask} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {completedTasks.length > 0 && (
              <>
                {pendingTasks.length > 0 && (
                  <div className="my-2 border-t border-dashed border-border" />
                )}
                <div className="space-y-2">
                  {completedTasks.map((task) => (
                    <TaskItem key={task.id} task={task} onEdit={onEditTask} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
