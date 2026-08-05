'use client';

import { useTranslations } from 'next-intl';

import { Pencil, Trash2 } from 'lucide-react';

import { type Category } from '@/core/domain/entities/category';

import { DataTable, type DataTableColumn } from '@/presentation/components/ui/DataTable';

import { CATEGORY_TYPE_ICONS } from '@/lib/category-icons';

interface CategoriesTableProps {
  categories: Category[];
  /** Open the edit form for the category (same handler the cards use). */
  onEdit: (category: Category) => void;
  /** Delete the category (same handler the cards use). */
  onDelete: (category: Category) => void;
}

/**
 * Table view of the categories list. Built on the shared `DataTable` primitive
 * and wired to the EXACT handlers the cards use (`onEdit`, `onDelete`), so
 * behavior is identical between the cards and the table. Default categories
 * expose no actions — same as the cards, which hide their menu entirely.
 */
export function CategoriesTable({ categories, onEdit, onDelete }: CategoriesTableProps) {
  const t = useTranslations('categories');

  const columns: DataTableColumn<Category>[] = [
    {
      key: 'name',
      header: t('table.name'),
      render: (category) => {
        const TypeIcon = CATEGORY_TYPE_ICONS[category.type];
        return (
          <div className="flex items-center gap-2">
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-md"
              style={{ backgroundColor: category.color ? `${category.color}20` : undefined }}
            >
              <TypeIcon className="size-4" style={{ color: category.color ?? undefined }} />
            </span>
            <span className="font-medium">{category.name}</span>
            {category.isDefault && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {t('default')}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'type',
      header: t('table.type'),
      render: (category) => (
        <span className="text-muted-foreground">
          {t(category.type === 'INCOME' ? 'income' : 'expense')}
        </span>
      ),
    },
    {
      key: 'color',
      header: t('table.color'),
      render: (category) =>
        category.color ? (
          <div className="flex items-center gap-2">
            <span
              className="size-4 shrink-0 rounded-full border border-border"
              style={{ backgroundColor: category.color }}
              aria-hidden
            />
            <span className="font-mono text-xs uppercase text-muted-foreground">
              {category.color}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'actions',
      header: t('table.actions'),
      align: 'right',
      render: (category) =>
        category.isDefault ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => onEdit(category)}
              aria-label={t('editCategory')}
              title={t('editCategory')}
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Pencil className="size-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => onDelete(category)}
              aria-label={t('deleteCategory')}
              title={t('deleteCategory')}
              className="inline-flex size-7 items-center justify-center rounded-md text-destructive transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          </div>
        ),
    },
  ];

  return <DataTable columns={columns} rows={categories} getRowKey={(category) => category.id} />;
}
