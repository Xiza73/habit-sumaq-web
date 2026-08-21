'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, GripVertical, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { useDeleteTask, useUpdateTask } from '@/core/application/hooks/use-tasks';
import { type Task, type TaskStatus } from '@/core/domain/entities/task';

import { ConfirmDialog } from '@/presentation/components/feedback/ConfirmDialog';
import { QuickTaskMarkdown } from '@/presentation/features/quick-tasks/QuickTaskMarkdown';

import { cn } from '@/lib/utils';

/** Click order: pending → validating → done → pending. */
const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  PENDING: 'IN_REVIEW',
  IN_REVIEW: 'DONE',
  DONE: 'PENDING',
};

/** Names the state the click MOVES TO, not the one it is in. */
const NEXT_STATUS_LABEL: Record<TaskStatus, string> = {
  PENDING: 'task.markInReview',
  IN_REVIEW: 'task.markDone',
  DONE: 'task.markPending',
};

interface TaskItemProps {
  task: Task;
  /** Pending tasks are sortable (drag handle). Completed tasks are not. */
  sortable?: boolean;
  onEdit: (task: Task) => void;
}

/**
 * Mirrors the structure of `QuickTaskItem` (drag handle, checkbox, expand on
 * click, edit/delete actions, markdown body) since the UX expectation for a
 * task row is the same. Differences from quick-tasks:
 * - Reuses the markdown renderer from quick-tasks (single source of truth).
 * - The toggle uses `useUpdateTask` which lives under the `tasks` namespace.
 */
export function TaskItem({ task, sortable = false, onEdit }: TaskItemProps) {
  const t = useTranslations('tasks');
  const tCommon = useTranslations('common');

  const updateMutation = useUpdateTask();
  const deleteMutation = useDeleteTask();

  const [expanded, setExpanded] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !sortable,
  });

  const style = sortable
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : undefined,
      }
    : undefined;

  const hasDescription = task.description !== null && task.description.trim().length > 0;

  function handleToggle() {
    updateMutation.mutate({ id: task.id, data: { status: NEXT_STATUS[task.status] } });
  }

  function handleRowExpand() {
    if (!hasDescription) return;
    setExpanded((v) => !v);
  }

  function handleRowKeyDown(e: React.KeyboardEvent) {
    if (!hasDescription) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setExpanded((v) => !v);
    }
  }

  function handleConfirmDelete() {
    deleteMutation.mutate(task.id, {
      onSuccess: () => {
        toast.success(tCommon('delete'));
        setConfirmingDelete(false);
      },
    });
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'group rounded-lg border border-border bg-card transition-colors',
          task.status === 'DONE' && 'bg-muted/40',
        )}
      >
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2.5 sm:px-4',
            hasDescription && 'cursor-pointer',
          )}
          onClick={handleRowExpand}
          onKeyDown={handleRowKeyDown}
          role={hasDescription ? 'button' : undefined}
          tabIndex={hasDescription ? 0 : undefined}
          aria-expanded={hasDescription ? expanded : undefined}
        >
          {sortable ? (
            <button
              type="button"
              aria-label={t('task.dragHandle')}
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
              className="-ml-1 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
            >
              <GripVertical className="size-4" />
            </button>
          ) : (
            <span className="w-3" aria-hidden="true" />
          )}

          {/* Three states in one control. `indeterminate` is exactly what
              IN_REVIEW means — partially done — and clicking cycles forward,
              with the label naming the state it is MOVING TO so the next
              click is never a guess. */}
          <input
            type="checkbox"
            ref={(el) => {
              if (el) el.indeterminate = task.status === 'IN_REVIEW';
            }}
            checked={task.status === 'DONE'}
            onChange={handleToggle}
            onClick={(e) => e.stopPropagation()}
            aria-label={t(NEXT_STATUS_LABEL[task.status])}
            className="size-4 shrink-0 cursor-pointer rounded border-input accent-primary"
          />

          <span
            className={cn(
              'flex-1 min-w-0 truncate text-sm font-medium',
              task.status === 'DONE' && 'text-muted-foreground line-through',
              task.status === 'IN_REVIEW' && 'text-muted-foreground',
            )}
          >
            {task.title}
          </span>

          {hasDescription && (
            <ChevronDown
              className={cn(
                'size-4 shrink-0 text-muted-foreground transition-[transform,opacity]',
                expanded && 'rotate-180',
                !expanded && 'sm:opacity-0 sm:group-hover:opacity-100',
              )}
              aria-hidden="true"
            />
          )}

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(task);
              }}
              aria-label={t('task.edit')}
              className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmingDelete(true);
              }}
              aria-label={t('task.delete')}
              className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>

        {hasDescription && expanded && (
          <div className="border-t border-border px-4 py-3">
            <QuickTaskMarkdown>{task.description ?? ''}</QuickTaskMarkdown>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title={t('task.delete')}
        description={t('task.deleteConfirm')}
        variant="destructive"
        confirmLabel={tCommon('delete')}
        loading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}
