'use client';

import { useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslations } from 'next-intl';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';

import { useCreateQuickTask, useUpdateQuickTask } from '@/core/application/hooks/use-quick-tasks';
import { type QuickTask } from '@/core/domain/entities/quick-task';
import {
  type CreateQuickTaskInput,
  createQuickTaskSchema,
} from '@/core/domain/schemas/quick-task.schema';

import { ApiError } from '@/infrastructure/api/api-error';

import { Input } from '@/presentation/components/ui/Input';
import { Modal } from '@/presentation/components/ui/Modal';

import { cn } from '@/lib/utils';

import { MarkdownToolbar } from './MarkdownToolbar';
import { QuickTaskMarkdown } from './QuickTaskMarkdown';

interface QuickTaskFormProps {
  open: boolean;
  task?: QuickTask | null;
  onClose: () => void;
}

/**
 * The form body lives in `<Body>` so it can compute its `defaultValues`
 * straight from the `task` prop — no `useEffect(() => form.reset(...))`,
 * no `setMode('edit')` after mount. The Modal returns null when closed
 * (see Modal.tsx), so each open mounts a fresh Body.
 */
export function QuickTaskForm({ open, task, onClose }: QuickTaskFormProps) {
  if (!open) return null;
  return <Body task={task ?? null} onClose={onClose} />;
}

interface BodyProps {
  task: QuickTask | null;
  onClose: () => void;
}

function Body({ task, onClose }: BodyProps) {
  const t = useTranslations('quickTasks');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const isEditing = !!task;

  const createMutation = useCreateQuickTask();
  const updateMutation = useUpdateQuickTask();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  // Ref shared between react-hook-form's `register` and the markdown toolbar
  // so the toolbar buttons can read/write the selection on the textarea.
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const form = useForm<CreateQuickTaskInput>({
    resolver: zodResolver(createQuickTaskSchema),
    defaultValues: task
      ? { title: task.title, description: task.description }
      : { title: '', description: null },
  });

  // useWatch instead of form.watch() so React Compiler can memoize this
  // component — form.watch() returns a function the compiler can't track.
  const descriptionValue = useWatch({ control: form.control, name: 'description' }) ?? '';

  function handleSubmit(values: CreateQuickTaskInput) {
    const payload: CreateQuickTaskInput = {
      title: values.title.trim(),
      description: values.description?.trim() ? values.description.trim() : null,
    };

    if (isEditing && task) {
      updateMutation.mutate(
        { id: task.id, data: payload },
        {
          onSuccess: () => {
            toast.success(tCommon('save'));
            onClose();
          },
          onError: handleError,
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success(tCommon('create'));
          onClose();
        },
        onError: handleError,
      });
    }
  }

  function handleError(error: Error) {
    toast.error(
      error instanceof ApiError && error.code && tErrors.has(error.code)
        ? tErrors(error.code as 'generic')
        : tErrors('generic'),
    );
  }

  // Combine RHF's ref with our textareaRef in a single callback so the
  // toolbar can manipulate the selection on the same node RHF tracks.
  const descriptionReg = form.register('description');
  function setTextareaRef(el: HTMLTextAreaElement | null) {
    descriptionReg.ref(el);
    textareaRef.current = el;
  }

  return (
    <Modal open onClose={onClose} title={isEditing ? t('editTask') : t('createTask')}>
      <form onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-medium">
            {t('titleField')}
          </label>
          <Input
            id="title"
            type="text"
            {...form.register('title')}
            placeholder={t('titlePlaceholder')}
            maxLength={120}
          />
          {form.formState.errors.title && (
            <p className="text-xs text-destructive">{t('titleRequired')}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="description" className="text-sm font-medium">
              {t('description')}
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
                {t('descriptionModeEdit')}
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
                {t('descriptionModePreview')}
              </button>
            </div>
          </div>

          {mode === 'edit' ? (
            <div className="overflow-hidden rounded-md border border-input bg-background shadow-xs transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50">
              <MarkdownToolbar textareaRef={textareaRef} />
              <textarea
                id="description"
                {...descriptionReg}
                ref={setTextareaRef}
                placeholder={t('descriptionPlaceholder')}
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
                  {t('descriptionPreviewEmpty')}
                </p>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground">{t('descriptionHint')}</p>
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
