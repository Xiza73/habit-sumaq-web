'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { useCategories, useDeleteCategory } from '@/core/application/hooks/use-categories';
import { type Category } from '@/core/domain/entities/category';
import { type CategoryType } from '@/core/domain/enums/category.enums';

import { ApiError } from '@/infrastructure/api/api-error';

import { ConfirmDialog } from '@/presentation/components/feedback/ConfirmDialog';

import { cn } from '@/lib/utils';

import { CategoryCard } from './CategoryCard';
import { CategoryCardSkeleton } from './CategoryCardSkeleton';
import { CategoryForm } from './CategoryForm';

export function CategoryList() {
  const t = useTranslations('categories');
  const tErrors = useTranslations('errors');

  const [activeTab, setActiveTab] = useState<CategoryType>('EXPENSE');
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: categories, isLoading } = useCategories(activeTab);
  const deleteMutation = useDeleteCategory();

  function handleEdit(category: Category) {
    setEditingCategory(category);
    setFormOpen(true);
  }

  function handleCloseForm() {
    setFormOpen(false);
    setEditingCategory(null);
  }

  function handleDeleteConfirm() {
    if (!deletingCategory) return;
    setDeleteError(null);
    deleteMutation.mutate(deletingCategory.id, {
      onSuccess: () => {
        setDeletingCategory(null);
        toast.success(t('deleteCategory'));
      },
      onError: (error) => {
        if (error instanceof ApiError && error.code === 'CAT_004') {
          setDeleteError(tErrors('CAT_004'));
        } else {
          setDeleteError(tErrors('generic'));
        }
      },
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="h-10 w-36 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
          <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <CategoryCardSkeleton />
          <CategoryCardSkeleton />
          <CategoryCardSkeleton />
          <CategoryCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <button
          type="button"
          onClick={() => {
            setEditingCategory(null);
            setFormOpen(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="size-4" />
          {t('createCategory')}
        </button>
      </div>

      <div className="flex gap-1 rounded-lg border border-border p-1">
        <button
          type="button"
          onClick={() => setActiveTab('EXPENSE')}
          className={cn(
            'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'EXPENSE'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted',
          )}
        >
          {t('expense')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('INCOME')}
          className={cn(
            'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'INCOME'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted',
          )}
        >
          {t('income')}
        </button>
      </div>

      {!categories?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <p className="max-w-xs text-muted-foreground">{t('emptyStateFiltered')}</p>
          <button
            type="button"
            onClick={() => {
              setEditingCategory(null);
              setFormOpen(true);
            }}
            className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="size-4" />
            {t('createCategory')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onEdit={handleEdit}
              onDelete={setDeletingCategory}
            />
          ))}
        </div>
      )}

      <CategoryForm
        open={formOpen}
        category={editingCategory}
        defaultType={activeTab}
        onClose={handleCloseForm}
      />

      <ConfirmDialog
        open={!!deletingCategory}
        title={t('deleteCategory')}
        description={deleteError ?? t('deleteConfirm')}
        variant="destructive"
        confirmLabel={t('deleteCategory')}
        loading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeletingCategory(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
}
