'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useCreateSection, useUpdateSection } from '@/core/application/hooks/use-sections';
import { type Section } from '@/core/domain/entities/section';
import { type CreateSectionInput, createSectionSchema } from '@/core/domain/schemas/section.schema';

import { ApiError } from '@/infrastructure/api/api-error';

import { Input } from '@/presentation/components/ui/Input';
import { Modal } from '@/presentation/components/ui/Modal';

interface SectionFormProps {
  open: boolean;
  section?: Section | null;
  onClose: () => void;
}

/**
 * Single modal that handles both create and edit. The schema permits an
 * optional `color` (`#RRGGBB`); the input is `<input type="color">` which
 * always emits a hex.
 */
export function SectionForm({ open, section, onClose }: SectionFormProps) {
  const t = useTranslations('tasks');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');

  const isEditing = !!section;
  const createMutation = useCreateSection();
  const updateMutation = useUpdateSection();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<CreateSectionInput>({
    resolver: zodResolver(createSectionSchema),
    defaultValues: { name: '', color: undefined },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: section?.name ?? '',
      color: section?.color ?? undefined,
    });
  }, [open, section, form]);

  function handleSubmit(values: CreateSectionInput) {
    const payload: CreateSectionInput = {
      name: values.name.trim(),
      color: values.color || undefined,
    };

    if (isEditing && section) {
      updateMutation.mutate(
        { id: section.id, data: { name: payload.name, color: payload.color ?? null } },
        {
          onSuccess: () => {
            toast.success(t('section.editSuccess'));
            onClose();
          },
          onError: handleError,
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success(t('section.createSuccess'));
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
      title={isEditing ? t('section.editTitle') : t('section.createTitle')}
    >
      <form onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="section-name" className="text-sm font-medium">
            {t('section.name')}
          </label>
          <Input
            id="section-name"
            type="text"
            {...form.register('name')}
            placeholder={t('section.namePlaceholder')}
            maxLength={60}
          />
          {form.formState.errors.name && (
            <p className="text-xs text-destructive">{t('section.nameRequired')}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="section-color" className="text-sm font-medium">
            {t('section.color')}
          </label>
          <div className="flex items-center gap-2">
            {/* `<input type="color">` always emits valid #RRGGBB so the regex
                in the schema is just a defensive belt-and-suspenders. */}
            <input
              id="section-color"
              type="color"
              {...form.register('color')}
              className="h-9 w-16 cursor-pointer rounded-md border border-input bg-background p-1"
            />
            <button
              type="button"
              onClick={() => form.setValue('color', undefined)}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              {t('section.clearColor')}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">{t('section.colorHint')}</p>
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
