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
import { ChevronDown, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { useUpdateSection } from '@/core/application/hooks/use-sections';
import { useReorderTasks } from '@/core/application/hooks/use-tasks';
import { type Section } from '@/core/domain/entities/section';
import { type Task } from '@/core/domain/entities/task';

import { cn } from '@/lib/utils';

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
 * One section's worth of UI: header (drag handle + color swatch + name +
 * counters + actions) plus its task list. Two visual cues the user can
 * tune via the section color: a 4px left border that runs the full card
 * height, and a tinted header background. Trello-style at low intensity —
 * loud enough to tell sections apart, soft enough not to fight the body.
 *
 * The header is a single click target that toggles a collapsed state. The
 * task list disappears when collapsed, but the counters stay visible so
 * the user keeps noción of pending + completed without expanding. State is
 * in-memory (component-level) — collapse choice does NOT persist across
 * sessions.
 *
 * The task list has its OWN nested DndContext so within-section reorders
 * don't bubble to the parent (sections) DndContext. Completed tasks render
 * below pending tasks (separator) and are NOT sortable — matches the
 * quick-tasks pattern. They'll cleanup at week boundary anyway.
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
  const updateSectionMutation = useUpdateSection();
  // Read collapsed state directly from the persisted section. Toggling fires
  // the mutation, which has an optimistic update in `useUpdateSection`, so
  // the click feels instant.
  const collapsed = section.isCollapsed;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
    disabled: !sortable,
  });

  // Apply the dnd-kit transform PLUS the colored left border. The border
  // colour comes from section.color; a null section.color falls back to
  // the primary accent via Tailwind's `border-l-primary`.
  const containerStyle: React.CSSProperties = {
    ...(sortable
      ? {
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.5 : undefined,
        }
      : {}),
    ...(section.color ? { borderLeftColor: section.color } : {}),
  };

  // Header background uses the section colour at ~12% alpha (the `20` hex
  // suffix). Backend's CHECK constraint guarantees colour is exactly
  // `#RRGGBB`, so we can safely append the alpha bytes. With no colour we
  // fall back to a neutral tint so the header still feels distinct.
  const headerStyle: React.CSSProperties | undefined = section.color
    ? { backgroundColor: `${section.color}20` }
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

  function toggleCollapsed() {
    updateSectionMutation.mutate(
      { id: section.id, data: { isCollapsed: !collapsed } },
      {
        onError: () => toast.error(tErrors('generic')),
      },
    );
  }

  function handleHeaderKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleCollapsed();
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={containerStyle}
      className={cn(
        // 4px left border — coloured via inline style when the section has
        // a colour, defaults to the primary accent otherwise. Rest of the
        // card keeps the standard 1px border.
        'overflow-hidden rounded-xl border border-l-4 border-border bg-card',
        !section.color && 'border-l-primary',
      )}
    >
      <header
        style={headerStyle}
        onClick={toggleCollapsed}
        onKeyDown={handleHeaderKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        aria-label={t('section.toggle', { name: section.name })}
        className={cn(
          'flex cursor-pointer items-center gap-2 border-b border-border px-3 py-2.5 transition-colors sm:px-4',
          // No coloured background when section.color is null — fall back
          // to a soft neutral so the header is still visually distinct
          // from the body. Hover slightly darkens it as a click affordance.
          !section.color && 'bg-muted/40 hover:bg-muted/60',
          section.color && 'hover:brightness-95',
        )}
      >
        {sortable && (
          <button
            type="button"
            aria-label={t('section.dragHandle')}
            {...attributes}
            {...listeners}
            // Drag handle: stop propagation so grabbing it doesn't toggle
            // collapse. Same applies to all other action buttons below.
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className="-ml-1 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          >
            <GripVertical className="size-4" />
          </button>
        )}
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            collapsed && '-rotate-90',
          )}
          aria-hidden
        />
        {section.color && (
          <span
            className="size-3 shrink-0 rounded-full border border-border/60"
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
            onClick={(e) => {
              e.stopPropagation();
              onAddTask(section.id);
            }}
            aria-label={t('task.add')}
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Plus className="size-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEditSection(section);
            }}
            aria-label={t('section.edit')}
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteSection(section);
            }}
            aria-label={t('section.delete')}
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </header>

      {!collapsed && (
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
      )}
    </div>
  );
}
