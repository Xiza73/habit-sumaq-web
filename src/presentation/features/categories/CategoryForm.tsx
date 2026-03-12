'use client';

import { useEffect } from 'react';
import { type Control, useForm, useWatch } from 'react-hook-form';
import { useTranslations } from 'next-intl';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useCreateCategory, useUpdateCategory } from '@/core/application/hooks/use-categories';
import { type Category } from '@/core/domain/entities/category';
import {
  type CreateCategoryInput,
  createCategorySchema,
  type UpdateCategoryInput,
} from '@/core/domain/schemas/category.schema';

import { ApiError } from '@/infrastructure/api/api-error';

import { Modal } from '@/presentation/components/ui/Modal';

function ColorPreview({ control }: { control: Control<CreateCategoryInput> }) {
  const color = useWatch({ control, name: 'color' });
  return <span className="text-sm text-muted-foreground">{color}</span>;
}

interface CategoryFormProps {
  open: boolean;
  category?: Category | null;
  defaultType?: 'INCOME' | 'EXPENSE';
  onClose: () => void;
}

export function CategoryForm({
  open,
  category,
  defaultType = 'EXPENSE',
  onClose,
}: CategoryFormProps) {
  const t = useTranslations('categories');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const isEditing = !!category;

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: '',
      type: defaultType,
      color: '#4CAF50',
      icon: null,
    },
  });

  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        type: category.type,
        color: category.color ?? '#4CAF50',
        icon: category.icon,
      });
    } else {
      form.reset({
        name: '',
        type: defaultType,
        color: '#4CAF50',
        icon: null,
      });
    }
  }, [category, defaultType, form]);

  function handleSubmit(values: CreateCategoryInput) {
    if (isEditing && category) {
      const updateData: UpdateCategoryInput = {
        name: values.name,
        color: values.color,
        icon: values.icon,
      };
      updateMutation.mutate(
        { id: category.id, data: updateData },
        {
          onSuccess: () => {
            toast.success(t('editCategory'));
            onClose();
          },
          onError: handleError,
        },
      );
    } else {
      createMutation.mutate(values, {
        onSuccess: () => {
          toast.success(t('createCategory'));
          onClose();
        },
        onError: handleError,
      });
    }
  }

  function handleError(error: Error) {
    if (error instanceof ApiError && error.code === 'CAT_002') {
      form.setError('name', { message: tErrors('CAT_002') });
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? t('editCategory') : t('createCategory')}
    >
      <form onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="cat-name" className="text-sm font-medium">
            {t('name')}
          </label>
          <input
            id="cat-name"
            type="text"
            {...form.register('name')}
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder={t('name')}
          />
          {form.formState.errors.name && (
            <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="cat-type" className="text-sm font-medium">
            {t('type')}
          </label>
          <select
            id="cat-type"
            {...form.register('type')}
            disabled={isEditing}
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="INCOME">{t('income')}</option>
            <option value="EXPENSE">{t('expense')}</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="cat-color" className="text-sm font-medium">
            {t('color')}
          </label>
          <div className="flex items-center gap-3">
            <input
              id="cat-color"
              type="color"
              {...form.register('color')}
              className="size-10 cursor-pointer rounded-md border border-border"
            />
            <ColorPreview control={form.control} />
          </div>
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
