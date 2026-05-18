'use client';

import { useState } from 'react';
import { type Control, type FieldValues, type Path, useController } from 'react-hook-form';
import { useTranslations } from 'next-intl';

import { Plus } from 'lucide-react';

import { useCategories } from '@/core/application/hooks/use-categories';
import { type CategoryType } from '@/core/domain/enums/category.enums';

import { Select } from '@/presentation/components/ui/Select';

import { CategoryForm } from './CategoryForm';

/**
 * Reusable category select that satisfies the project-wide rule:
 *
 * > Any form with a category select MUST offer inline "+ Crear nueva
 * > categoría" so the user can stay in the parent flow when the
 * > category they want isn't in the list.
 *
 * Encapsulates the label + Select + "create new" button + CategoryForm
 * modal + auto-select on create. Drop into any RHF form that needs a
 * category picker. The parent only manages the form schema; this
 * component handles the inline-creation flow on its own.
 *
 * Use `<CategorySelectField>` instead of a raw `<Select>` for any new
 * form that picks a category. See
 * [business-rules.md](docs/frontend/business-rules.md#inline-category-creation).
 */
interface CategorySelectFieldProps<T extends FieldValues> {
  control: Control<T>;
  /** Form field path (e.g. `"categoryId"`). */
  name: Path<T>;
  /**
   * Filters the dropdown to `INCOME` or `EXPENSE` categories AND sets the
   * `defaultType` of the inline `CategoryForm` so the user doesn't have to
   * flip it manually for the common case.
   */
  categoryType: CategoryType;
  /** id used by the visible `<label htmlFor>`. */
  id: string;
  /** Visible label above the select. Omitted when the parent renders its own. */
  label?: string;
  /** Copy for the empty `<option>`. Some forms want "Sin categoría", others "Todas las categorías". */
  emptyOptionLabel: string;
  /** Form error to render below the field (typically from `form.formState.errors[name]?.message`). */
  errorMessage?: string;
  disabled?: boolean;
}

export function CategorySelectField<T extends FieldValues>({
  control,
  name,
  categoryType,
  id,
  label,
  emptyOptionLabel,
  errorMessage,
  disabled,
}: CategorySelectFieldProps<T>) {
  const t = useTranslations('categories');
  const { field } = useController({ control, name });
  const { data: categories } = useCategories(categoryType);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  return (
    <>
      <div className="space-y-2">
        {label && (
          <label htmlFor={id} className="text-sm font-medium">
            {label}
          </label>
        )}
        <Select
          id={id}
          value={field.value ?? ''}
          onChange={(e) => field.onChange(e.target.value)}
          onBlur={field.onBlur}
          disabled={disabled}
        >
          <option value="">{emptyOptionLabel}</option>
          {categories?.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        <button
          type="button"
          onClick={() => setIsCreatingCategory(true)}
          disabled={disabled}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:underline disabled:opacity-50"
        >
          <Plus className="size-3" />
          {t('createNew')}
        </button>
        {errorMessage && <p className="text-xs text-destructive">{errorMessage}</p>}
      </div>

      <CategoryForm
        open={isCreatingCategory}
        defaultType={categoryType}
        onClose={() => setIsCreatingCategory(false)}
        onCreated={(created) => {
          // Auto-select the new category in the parent form. `shouldDirty: true`
          // marks the form as touched so submit isn't blocked by a "no changes"
          // gate (relevant when this field is part of an edit form).
          field.onChange(created.id);
        }}
      />
    </>
  );
}
