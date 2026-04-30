'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';

import { useCreateTask, useUpdateTask } from '@/core/application/hooks/use-tasks';
import { type Section } from '@/core/domain/entities/section';
import { type Task } from '@/core/domain/entities/task';
import { type CreateTaskInput, createTaskSchema } from '@/core/domain/schemas/task.schema';

import { ApiError } from '@/infrastructure/api/api-error';

import { Input } from '@/presentation/components/ui/Input';
import { Modal } from '@/presentation/components/ui/Modal';
import { Select } from '@/presentation/components/ui/Select';
import { MarkdownToolbar } from '@/presentation/features/quick-tasks/MarkdownToolbar';
import { QuickTaskMarkdown } from '@/presentation/features/quick-tasks/QuickTaskMarkdown';

import { cn } from '@/lib/utils';

interface TaskFormProps {
  open: boolean;
  task?: Task | null;
  /** Pre-selects a section in create mode. Ignored when editing (the task's current section wins). */
  defaultSectionId?: string;
  /** All sections owned by the user — used to populate the section select. */
  sections: Section[];
  onClose: () => void;
}

/**
 * Modal for create + edit. The section select is enabled in BOTH modes:
 * - Create: pick where the task lands. Defaults to `defaultSectionId` (or first section).
 * - Edit: change `sectionId` to move the task to a different section. The
 *   backend resets the position to the end of the destination section
 *   automatically.
 *
 * Description is markdown — reuses the `QuickTaskMarkdown` renderer + the
 * shared `MarkdownToolbar` so the editing UX matches Diarias / Priorities.
 */
export function TaskForm({ open, task, defaultSectionId, sections, onClose }: TaskFormProps) {
  const t = useTranslations('tasks');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');

  const isEditing = !!task;
  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const form = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { sectionId: '', title: '', description: null },
  });

  const descriptionValue = form.watch('description') ?? '';

  useEffect(() => {
    if (!open) return;
    setMode('edit');
    if (task) {
      form.reset({
        sectionId: task.sectionId,
        title: task.title,
        description: task.description,
      });
    } else {
      form.reset({
        sectionId: defaultSectionId ?? sections[0]?.id ?? '',
        title: '',
        description: null,
      });
    }
  }, [open, task, defaultSectionId, sections, form]);

  function handleSubmit(values: CreateTaskInput) {
    const payload: CreateTaskInput = {
      sectionId: values.sectionId,
      title: values.title.trim(),
      description: values.description?.trim() ? values.description.trim() : null,
    };

    if (isEditing && task) {
      updateMutation.mutate(
        {
          id: task.id,
          data: {
            title: payload.title,
            description: payload.description,
            // Only include sectionId if it actually changed — the backend
            // treats the field as a "move me" intent and reassigns position.
            sectionId: payload.sectionId !== task.sectionId ? payload.sectionId : undefined,
          },
        },
        {
          onSuccess: () => {
            toast.success(t('task.editSuccess'));
            onClose();
          },
          onError: handleError,
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success(t('task.createSuccess'));
          onClose();
        },
        onError: handleError,
      });
    }
  }

  function handleError(error: Error) {
    toast.error(
      error instanceof ApiError && error.code && tErrors.has(error.code)
        ? tErrors(error.code as 'TSK_001')
        : tErrors('generic'),
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? t('task.editTitle') : t('task.createTitle')}
    >
      <form onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="task-section" className="text-sm font-medium">
            {t('task.section')}
          </label>
          <Select id="task-section" {...form.register('sectionId')}>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          {form.formState.errors.sectionId && (
            <p className="text-xs text-destructive">{tCommon('required')}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="task-title" className="text-sm font-medium">
            {t('task.titleField')}
          </label>
          <Input
            id="task-title"
            type="text"
            {...form.register('title')}
            placeholder={t('task.titlePlaceholder')}
            maxLength={120}
          />
          {form.formState.errors.title && (
            <p className="text-xs text-destructive">{t('task.titleRequired')}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="task-description" className="text-sm font-medium">
              {t('task.description')}
            </label>
            <div className="flex items-center rounded-md border border-border p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setMode('edit')}
                className={cn(
                  'flex items-center gap-1 rounded px-2 py-1 transition-colors',
                  mode === 'edit'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Pencil className="size-3" />
                {t('task.descriptionModeEdit')}
              </button>
              <button
                type="button"
                onClick={() => setMode('preview')}
                className={cn(
                  'flex items-center gap-1 rounded px-2 py-1 transition-colors',
                  mode === 'preview'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Eye className="size-3" />
                {t('task.descriptionModePreview')}
              </button>
            </div>
          </div>

          {mode === 'edit' ? (
            <div className="overflow-hidden rounded-md border border-input bg-background shadow-xs transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50">
              <MarkdownToolbar textareaRef={textareaRef} />
              <textarea
                id="task-description"
                {...(() => {
                  const reg = form.register('description');
                  return {
                    ...reg,
                    ref: (el: HTMLTextAreaElement | null) => {
                      reg.ref(el);
                      textareaRef.current = el;
                    },
                  };
                })()}
                placeholder={t('task.descriptionPlaceholder')}
                rows={6}
                maxLength={5000}
                className="block w-full bg-transparent px-3 py-2 font-mono text-sm placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          ) : (
            <div className="min-h-[9rem] rounded-md border border-input bg-muted/30 px-3 py-2">
              {descriptionValue.trim() ? (
                <QuickTaskMarkdown>{descriptionValue}</QuickTaskMarkdown>
              ) : (
                <p className="text-sm italic text-muted-foreground">
                  {t('task.descriptionPreviewEmpty')}
                </p>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground">{t('task.descriptionHint')}</p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            {tCommon('cancel')}
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isEditing ? tCommon('save') : tCommon('create')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
