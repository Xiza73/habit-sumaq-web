'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, GripVertical, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { useDeleteQuickTask, useUpdateQuickTask } from '@/core/application/hooks/use-quick-tasks';
import { type QuickTask } from '@/core/domain/entities/quick-task';

import { ConfirmDialog } from '@/presentation/components/feedback/ConfirmDialog';

import { cn } from '@/lib/utils';

import { QuickTaskMarkdown } from './QuickTaskMarkdown';

interface QuickTaskItemProps {
  task: QuickTask;
  /** True when this item belongs to the sortable pending set. */
  sortable?: boolean;
  onEdit: (task: QuickTask) => void;
}

export function QuickTaskItem({ task, sortable = false, onEdit }: QuickTaskItemProps) {
  const t = useTranslations('quickTasks');
  const tCommon = useTranslations('common');

  const updateMutation = useUpdateQuickTask();
  const deleteMutation = useDeleteQuickTask();

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
    updateMutation.mutate({ id: task.id, data: { completed: !task.completed } });
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
          task.completed && 'bg-muted/40',
        )}
      >
        <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
          {sortable ? (
            <button
              type="button"
              aria-label={t('dragHandle')}
              {...attributes}
              {...listeners}
              className="-ml-1 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
            >
              <GripVertical className="size-4" />
            </button>
          ) : (
            <span className="w-3" aria-hidden="true" />
          )}

          <input
            type="checkbox"
            checked={task.completed}
            onChange={handleToggle}
            aria-label={task.completed ? t('markIncomplete') : t('markComplete')}
            className="size-4 shrink-0 cursor-pointer rounded border-input accent-primary"
          />

          <button
            type="button"
            onClick={() => hasDescription && setExpanded((v) => !v)}
            className={cn(
              'flex-1 min-w-0 text-left',
              hasDescription ? 'cursor-pointer' : 'cursor-default',
            )}
            aria-expanded={hasDescription ? expanded : undefined}
          >
            <span
              className={cn(
                'block truncate text-sm font-medium',
                task.completed && 'text-muted-foreground line-through',
              )}
            >
              {task.title}
            </span>
          </button>

          {hasDescription && (
            <ChevronDown
              className={cn(
                'size-4 shrink-0 text-muted-foreground transition-transform',
                expanded && 'rotate-180',
              )}
              aria-hidden="true"
            />
          )}

          {/* Actions always visible on touch devices (mobile/tablet); on
              hover-capable pointers they fade in on hover to keep the card
              visually quieter. */}
          <div className="flex shrink-0 items-center gap-1 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
            <button
              type="button"
              onClick={() => onEdit(task)}
              aria-label={t('editTask')}
              className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              aria-label={t('deleteTask')}
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
        title={t('deleteTask')}
        description={t('deleteConfirm')}
        variant="destructive"
        confirmLabel={tCommon('delete')}
        loading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}
