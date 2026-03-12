'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { MoreVertical, Pencil, Trash2 } from 'lucide-react';

import { type Category } from '@/core/domain/entities/category';

import { CATEGORY_TYPE_ICONS } from '@/lib/category-icons';

interface CategoryCardProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

export function CategoryCard({ category, onEdit, onDelete }: CategoryCardProps) {
  const t = useTranslations('categories');
  const [menuOpen, setMenuOpen] = useState(false);

  const TypeIcon = CATEGORY_TYPE_ICONS[category.type];

  return (
    <div className="group relative flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: category.color ? `${category.color}20` : undefined }}
      >
        <TypeIcon className="size-5" style={{ color: category.color ?? undefined }} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{category.name}</p>
        <p className="text-xs text-muted-foreground">
          {t(category.type === 'INCOME' ? 'income' : 'expense')}
          {category.isDefault && (
            <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px]">
              {t('default')}
            </span>
          )}
        </p>
      </div>

      {!category.isDefault && (
        <div className="absolute right-3 top-3">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
            aria-label="Category actions"
          >
            <MoreVertical className="size-4" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setMenuOpen(false);
                }}
                role="button"
                tabIndex={0}
                aria-label="Close menu"
              />
              <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-border bg-popover py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(category);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                >
                  <Pencil className="size-4" />
                  {t('editCategory')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(category);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted"
                >
                  <Trash2 className="size-4" />
                  {t('deleteCategory')}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
